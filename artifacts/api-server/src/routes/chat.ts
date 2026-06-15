import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, tasksTable, activityLogsTable, chatMessagesTable } from "@workspace/db";
import { ai } from "@workspace/integrations-gemini-ai";
import {
  SendChatMessageBody,
  GetChatHistoryQueryParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

type AiAction =
  | { action: "create_task"; title: string; target: number; unit: string; due_scope?: string; response_text: string }
  | { action: "update_task"; task_name: string; amount?: number; operation: "add" | "subtract" | "set" | "reset"; response_text: string }
  | { action: "show_remaining"; response_text: string }
  | { action: "show_tasks"; response_text: string }
  | { action: "chat"; response_text: string };

async function extractAction(
  userMessage: string,
  tasks: Array<{ id: number; title: string; completedValue: string; targetValue: string; unit: string }>,
  recentHistory: Array<{ role: string; content: string }>,
): Promise<AiAction> {
  const taskContext =
    tasks.length > 0
      ? tasks
          .map((t) => `- "${t.title}": ${t.completedValue}/${t.targetValue} ${t.unit} done`)
          .join("\n")
      : "No tasks yet.";

  const historyContext =
    recentHistory.length > 0
      ? recentHistory
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n")
      : "";

  const prompt = `You are LifeOS AI — a smart personal execution assistant. You help users track measurable goals and also chat naturally about anything.

## Current tasks:
${taskContext}

${historyContext ? `## Recent conversation:\n${historyContext}\n` : ""}
## User just said: "${userMessage}"

## Your job:
Understand the user's intent — even with typos, casual phrasing, or abbreviations — and pick the best action below.

Return ONLY valid JSON. No markdown. No explanation. Just the JSON object.

---

### Actions:

**create_task** — User wants to set a new goal or task (e.g., "I want to solve 50 SQL questions", "set a goal of reading 30 pages", "add task: 100 pushups")
{"action":"create_task","title":"<clean task name>","target":<number>,"unit":"<unit e.g. questions/pages/pushups>","due_scope":"today|this_week|this_month|goal","response_text":"<encouraging reply>"}
- due_scope is optional — include only if user mentions a timeframe
- Infer reasonable unit if not stated (e.g., "50 SQL" → unit: "questions")

**update_task** — User logged progress or wants to change progress (e.g., "I solved 10 questions", "done 20 more", "I finished 5 SQL problems", "mark 15 as done")
{"action":"update_task","task_name":"<match to existing task>","amount":<number>,"operation":"add|subtract|set|reset","response_text":"<celebratory/encouraging reply>"}
- Use "add" for: "I did X", "solved X", "completed X more", "finished X"
- Use "subtract" for: removing/undoing progress
- Use "set" for: "I've done X total", "set to X"
- Use "reset" for: starting over
- Match task_name to the closest existing task using fuzzy matching (SQL questions ≈ SQL ≈ sql problems ≈ questions)
- If user says "I solved 20 questions" and there's a SQL questions task, that's an update_task

**show_remaining** — User asks what's left (e.g., "what's left?", "how much more?", "remaining work")
{"action":"show_remaining","response_text":"<list remaining for each active task>"}

**show_tasks** — User wants to see all tasks/progress (e.g., "show tasks", "what's my progress?", "how am I doing?")
{"action":"show_tasks","response_text":"<list all tasks with progress>"}

**chat** — Anything else: greetings, general questions, motivation, advice, casual talk
{"action":"chat","response_text":"<natural, helpful, friendly response — can be multiple sentences>"}
- For greetings: be warm, introduce yourself briefly, mention you can help track tasks and chat
- For questions about studying, productivity, SQL, coding, etc.: give genuinely helpful answers
- For motivation: be encouraging and specific
- Do NOT force task creation for general chat

---

### Rules:
- Handle typos gracefully: "todat"=today, "ques"=questions, "cmplete"=complete, etc.
- If user mentions completing work on an EXISTING task, prefer update_task over chat
- If user mentions a new goal with a number, prefer create_task
- For the chat action, response_text can be as long as needed — be genuinely helpful
- Never say "I had trouble understanding" — always respond usefully
- Keep task-related response_text encouraging and specific (mention numbers)`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 1024,
    },
  });

  const text = response.text ?? "{}";
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  try {
    return JSON.parse(cleaned) as AiAction;
  } catch {
    const retryResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: `${prompt}\n\nCRITICAL: Return ONLY a raw JSON object. Nothing else. No text before or after.` }] }],
      config: { responseMimeType: "application/json", maxOutputTokens: 512 },
    });
    const retryText = (retryResponse.text ?? "{}").replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const retryMatch = retryText.match(/\{[\s\S]*\}/);
    return JSON.parse(retryMatch ? retryMatch[0] : retryText) as AiAction;
  }
}

function formatTask(task: typeof tasksTable.$inferSelect) {
  const target = parseFloat(task.targetValue);
  const completed = parseFloat(task.completedValue);
  const remaining = Math.max(0, target - completed);
  return {
    id: task.id,
    title: task.title,
    target_value: target,
    completed_value: completed,
    remaining,
    unit: task.unit,
    status: task.status,
    due_scope: task.dueScope ?? null,
    due_date: task.dueDate ?? null,
    created_at: task.createdAt.toISOString(),
    updated_at: task.updatedAt.toISOString(),
  };
}

// POST /api/chat/message
router.post("/message", async (req, res) => {
  const userId = "owner";

  const body = SendChatMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const userContent = body.data.content;

  const [userMsg] = await db
    .insert(chatMessagesTable)
    .values({ userId, role: "user", content: userContent, actionType: null })
    .returning();

  const [tasks, recentMessages] = await Promise.all([
    db.select().from(tasksTable).where(eq(tasksTable.userId, userId)),
    db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.userId, userId))
      .orderBy(desc(chatMessagesTable.createdAt))
      .limit(10),
  ]);

  const recentHistory = recentMessages
    .reverse()
    .filter((m) => m.id !== userMsg.id)
    .slice(-6)
    .map((m) => ({ role: m.role, content: m.content }));

  let aiAction: AiAction;
  try {
    aiAction = await extractAction(
      userContent,
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        completedValue: t.completedValue,
        targetValue: t.targetValue,
        unit: t.unit,
      })),
      recentHistory,
    );
  } catch (err) {
    logger.error({ err }, "Gemini extraction failed");
    aiAction = {
      action: "chat",
      response_text: "Sorry, I ran into an issue. Try again in a moment!",
    };
  }

  let affectedTask: ReturnType<typeof formatTask> | null = null;

  if (aiAction.action === "create_task") {
    const [newTask] = await db
      .insert(tasksTable)
      .values({
        userId,
        title: aiAction.title,
        targetValue: String(aiAction.target),
        completedValue: "0",
        unit: aiAction.unit,
        dueScope: (aiAction.due_scope as "today" | "this_week" | "this_month" | "goal") ?? null,
      })
      .returning();

    await db.insert(activityLogsTable).values({
      userId,
      taskId: newTask.id,
      operation: "create",
      amount: null,
      userMessage: userContent,
    });

    affectedTask = formatTask(newTask);
  } else if (aiAction.action === "update_task") {
    const matchedTask =
      tasks.find(
        (t) =>
          t.title.toLowerCase().includes(aiAction.task_name.toLowerCase()) ||
          aiAction.task_name.toLowerCase().includes(t.title.toLowerCase()),
      ) ??
      tasks.find((t) => {
        const words = aiAction.task_name.toLowerCase().split(/\s+/);
        return words.some((w) => w.length > 2 && t.title.toLowerCase().includes(w));
      });

    if (matchedTask) {
      const current = parseFloat(matchedTask.completedValue);
      const target = parseFloat(matchedTask.targetValue);
      let newCompleted: number;

      switch (aiAction.operation) {
        case "add":
          newCompleted = current + (aiAction.amount ?? 0);
          break;
        case "subtract":
          newCompleted = Math.max(0, current - (aiAction.amount ?? 0));
          break;
        case "set":
          newCompleted = aiAction.amount ?? 0;
          break;
        case "reset":
          newCompleted = 0;
          break;
        default:
          newCompleted = current;
      }

      newCompleted = Math.max(0, newCompleted);
      const newStatus = newCompleted >= target ? "completed" : "active";

      const [updated] = await db
        .update(tasksTable)
        .set({ completedValue: String(newCompleted), status: newStatus })
        .where(and(eq(tasksTable.id, matchedTask.id), eq(tasksTable.userId, userId)))
        .returning();

      await db.insert(activityLogsTable).values({
        userId,
        taskId: matchedTask.id,
        operation: aiAction.operation,
        amount: aiAction.amount != null ? String(aiAction.amount) : null,
        userMessage: userContent,
      });

      affectedTask = formatTask(updated);
    }
  }

  const [assistantMsg] = await db
    .insert(chatMessagesTable)
    .values({
      userId,
      role: "assistant",
      content: aiAction.response_text,
      actionType: aiAction.action === "chat" ? null : aiAction.action,
    })
    .returning();

  void assistantMsg;

  res.json({
    message: {
      id: userMsg.id,
      role: userMsg.role as "user" | "assistant",
      content: userMsg.content,
      action_type: userMsg.actionType ?? null,
      created_at: userMsg.createdAt.toISOString(),
    },
    response_text: aiAction.response_text,
    action_type: aiAction.action === "chat" ? null : aiAction.action,
    affected_task: affectedTask,
  });
});

// GET /api/chat/history
router.get("/history", async (req, res) => {
  const userId = "owner";

  const query = GetChatHistoryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const limit = query.data.limit ?? 50;

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.userId, userId))
    .orderBy(desc(chatMessagesTable.createdAt))
    .limit(limit);

  res.json(
    messages.reverse().map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      action_type: m.actionType ?? null,
      created_at: m.createdAt.toISOString(),
    })),
  );
});

// DELETE /api/chat/history
router.delete("/history", async (req, res) => {
  const userId = "owner";

  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.userId, userId));
  res.status(204).send();
});

export default router;

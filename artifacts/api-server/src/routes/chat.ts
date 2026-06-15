import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, tasksTable, activityLogsTable, chatMessagesTable } from "@workspace/db";
import { getAuth } from "@clerk/express";
import { ai } from "@workspace/integrations-gemini-ai";
import {
  SendChatMessageBody,
  GetChatHistoryQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router = Router();

type AiAction =
  | { action: "create_task"; title: string; target: number; unit: string; due_scope?: string; response_text: string }
  | { action: "update_task"; task_name: string; amount?: number; operation: "add" | "subtract" | "set" | "reset"; response_text: string }
  | { action: "show_remaining"; response_text: string }
  | { action: "show_tasks"; response_text: string }
  | { action: "unknown"; response_text: string };

async function extractAction(
  userMessage: string,
  tasks: Array<{ id: number; title: string; completedValue: string; targetValue: string; unit: string }>,
): Promise<AiAction> {
  const taskContext =
    tasks.length > 0
      ? tasks
          .map(
            (t) =>
              `- "${t.title}" (${t.completedValue}/${t.targetValue} ${t.unit})`,
          )
          .join("\n")
      : "No tasks yet.";

  const prompt = `You are LifeOS AI — an execution assistant that helps users track measurable work.

Current user tasks:
${taskContext}

User message: "${userMessage}"

Respond with ONLY valid JSON (no markdown, no explanation). Choose ONE action:

1. create_task — user wants to set a new goal/task
   {"action":"create_task","title":"...","target":50,"unit":"questions","due_scope":"today|this_week|this_month|goal","response_text":"..."}
   due_scope is optional — only include if user mentions today/this week/this month/goal.

2. update_task — user logged progress or wants to change a task's progress
   {"action":"update_task","task_name":"...","amount":5,"operation":"add|subtract|set|reset","response_text":"..."}
   - "add" when user says "I did X more" or "I solved X" or "I completed X"
   - "subtract" when user made an error and needs to reduce
   - "set" when user says "I have done X total" or "set to X"
   - "reset" when user wants to start over
   - task_name should match the most relevant existing task using intelligent fuzzy matching

3. show_remaining — user asks what work is left
   {"action":"show_remaining","response_text":"..."}
   Include remaining work for all active tasks in response_text.

4. show_tasks — user wants to see all tasks
   {"action":"show_tasks","response_text":"..."}
   List all tasks with progress in response_text.

5. unknown — anything else (general question, greeting, etc.)
   {"action":"unknown","response_text":"..."}

Rules:
- Always include response_text with a helpful, concise reply (1-3 sentences max).
- For update_task, match task_name to the most relevant existing task title, even if user uses synonyms (questions=problems=mcqs=exercises).
- Never include markdown in response_text.
- Keep response_text natural and encouraging.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
    },
  });

  const text = response.text ?? "{}";
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as AiAction;
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
router.post("/message", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const body = SendChatMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const userContent = body.data.content;

  const [userMsg] = await db
    .insert(chatMessagesTable)
    .values({ userId: userId!, role: "user", content: userContent, actionType: null })
    .returning();

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.userId, userId!));

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
    );
  } catch (err) {
    logger.error({ err }, "Gemini extraction failed");
    aiAction = {
      action: "unknown",
      response_text: "I had trouble understanding that. Could you rephrase?",
    };
  }

  let affectedTask: ReturnType<typeof formatTask> | null = null;

  if (aiAction.action === "create_task") {
    const [newTask] = await db
      .insert(tasksTable)
      .values({
        userId: userId!,
        title: aiAction.title,
        targetValue: String(aiAction.target),
        completedValue: "0",
        unit: aiAction.unit,
        dueScope: (aiAction.due_scope as "today" | "this_week" | "this_month" | "goal") ?? null,
      })
      .returning();

    await db.insert(activityLogsTable).values({
      userId: userId!,
      taskId: newTask.id,
      operation: "create",
      amount: null,
      userMessage: userContent,
    });

    affectedTask = formatTask(newTask);
  } else if (aiAction.action === "update_task") {
    const matchedTask = tasks.find((t) =>
      t.title.toLowerCase().includes(aiAction.task_name.toLowerCase()) ||
      aiAction.task_name.toLowerCase().includes(t.title.toLowerCase()),
    ) ?? tasks.find((t) => {
      const words = aiAction.task_name.toLowerCase().split(/\s+/);
      return words.some((w) => t.title.toLowerCase().includes(w));
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
        .where(and(eq(tasksTable.id, matchedTask.id), eq(tasksTable.userId, userId!)))
        .returning();

      await db.insert(activityLogsTable).values({
        userId: userId!,
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
      userId: userId!,
      role: "assistant",
      content: aiAction.response_text,
      actionType: aiAction.action,
    })
    .returning();

  const userMsgFormatted = {
    id: userMsg.id,
    role: userMsg.role as "user" | "assistant",
    content: userMsg.content,
    action_type: userMsg.actionType ?? null,
    created_at: userMsg.createdAt.toISOString(),
  };

  void assistantMsg;

  res.json({
    message: userMsgFormatted,
    response_text: aiAction.response_text,
    action_type: aiAction.action === "unknown" ? null : aiAction.action,
    affected_task: affectedTask,
  });
});

// GET /api/chat/history
router.get("/history", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const query = GetChatHistoryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const limit = query.data.limit ?? 50;

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.userId, userId!))
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
router.delete("/history", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  await db
    .delete(chatMessagesTable)
    .where(eq(chatMessagesTable.userId, userId!));
  res.status(204).send();
});

export default router;

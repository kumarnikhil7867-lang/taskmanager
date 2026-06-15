import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, tasksTable, activityLogsTable } from "@workspace/db";
import {
  CreateTaskBody,
  UpdateTaskBody,
  UpdateTaskProgressBody,
  GetTaskParams,
  UpdateTaskParams,
  DeleteTaskParams,
  UpdateTaskProgressParams,
  ListTasksQueryParams,
} from "@workspace/api-zod";

const router = Router();

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

// GET /api/tasks
router.get("/",  async (req, res) => {
  const userId = "owner";
  
  const query = ListTasksQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const conditions = [eq(tasksTable.userId, userId!)];
  if (query.data.status) {
    conditions.push(
      eq(tasksTable.status, query.data.status as "active" | "completed" | "paused"),
    );
  }
  if (query.data.due_scope) {
    conditions.push(
      eq(tasksTable.dueScope, query.data.due_scope as "today" | "this_week" | "this_month" | "goal"),
    );
  }

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(and(...conditions))
    .orderBy(tasksTable.createdAt);

  res.json(tasks.map(formatTask));
});

// POST /api/tasks
router.post("/",  async (req, res) => {
  const userId = "owner";
  
  const body = CreateTaskBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [task] = await db
    .insert(tasksTable)
    .values({
      userId: userId!,
      title: body.data.title,
      targetValue: String(body.data.target_value),
      completedValue: "0",
      unit: body.data.unit,
      dueScope: (body.data.due_scope as "today" | "this_week" | "this_month" | "goal") ?? null,
      dueDate: body.data.due_date ?? null,
    })
    .returning();

  await db.insert(activityLogsTable).values({
    userId: userId!,
    taskId: task.id,
    operation: "create",
    amount: null,
    userMessage: null,
  });

  res.status(201).json(formatTask(task));
});

// GET /api/tasks/:id
router.get("/:id",  async (req, res) => {
  const userId = "owner";
  
  const id = parseInt(String(req.params.id));
  const params = GetTaskParams.safeParse({ id });
  if (!params.success) {
    res.status(400).json({ error: "Invalid task ID" });
    return;
  }

  const [task] = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, params.data.id), eq(tasksTable.userId, userId!)));

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(formatTask(task));
});

// PATCH /api/tasks/:id
router.patch("/:id",  async (req, res) => {
  const userId = "owner";
  
  const id = parseInt(String(req.params.id));
  const params = UpdateTaskParams.safeParse({ id });
  if (!params.success) {
    res.status(400).json({ error: "Invalid task ID" });
    return;
  }

  const body = UpdateTaskBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const updateData: Partial<typeof tasksTable.$inferInsert> = {};
  if (body.data.title !== undefined) updateData.title = body.data.title;
  if (body.data.target_value !== undefined)
    updateData.targetValue = String(body.data.target_value);
  if (body.data.unit !== undefined) updateData.unit = body.data.unit;
  if (body.data.status !== undefined)
    updateData.status = body.data.status as "active" | "completed" | "paused";
  if (body.data.due_scope !== undefined)
    updateData.dueScope = body.data.due_scope as "today" | "this_week" | "this_month" | "goal";
  if (body.data.due_date !== undefined) updateData.dueDate = body.data.due_date;

  const [task] = await db
    .update(tasksTable)
    .set(updateData)
    .where(and(eq(tasksTable.id, params.data.id), eq(tasksTable.userId, userId!)))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(formatTask(task));
});

// DELETE /api/tasks/:id
router.delete("/:id",  async (req, res) => {
  const userId = "owner";
  
  const id = parseInt(String(req.params.id));
  const params = DeleteTaskParams.safeParse({ id });
  if (!params.success) {
    res.status(400).json({ error: "Invalid task ID" });
    return;
  }

  const [deleted] = await db
    .delete(tasksTable)
    .where(and(eq(tasksTable.id, params.data.id), eq(tasksTable.userId, userId!)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.status(204).send();
});

// POST /api/tasks/:id/progress
router.post("/:id/progress",  async (req, res) => {
  const userId = "owner";
  
  const id = parseInt(String(req.params.id));
  const params = UpdateTaskProgressParams.safeParse({ id });
  if (!params.success) {
    res.status(400).json({ error: "Invalid task ID" });
    return;
  }

  const body = UpdateTaskProgressBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [existing] = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, params.data.id), eq(tasksTable.userId, userId!)));

  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const current = parseFloat(existing.completedValue);
  const target = parseFloat(existing.targetValue);
  let newCompleted: number;

  switch (body.data.operation) {
    case "add":
      newCompleted = current + (body.data.amount ?? 0);
      break;
    case "subtract":
      newCompleted = Math.max(0, current - (body.data.amount ?? 0));
      break;
    case "set":
      newCompleted = body.data.amount ?? 0;
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
    .where(and(eq(tasksTable.id, params.data.id), eq(tasksTable.userId, userId!)))
    .returning();

  await db.insert(activityLogsTable).values({
    userId: userId!,
    taskId: params.data.id,
    operation: body.data.operation as "add" | "subtract" | "set" | "reset",
    amount: body.data.amount != null ? String(body.data.amount) : null,
    userMessage: body.data.user_message ?? null,
  });

  res.json(formatTask(updated));
});

export default router;

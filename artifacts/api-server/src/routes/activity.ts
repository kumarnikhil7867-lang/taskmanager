import { Router } from "express";
import { eq, and, desc, gte, lt } from "drizzle-orm";
import { db, activityLogsTable, tasksTable } from "@workspace/db";
import { getAuth } from "@clerk/express";
import {
  GetTaskActivityParams,
  ListActivityLogsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function formatLog(
  log: typeof activityLogsTable.$inferSelect,
  taskTitle: string,
) {
  return {
    id: log.id,
    task_id: log.taskId,
    task_title: taskTitle,
    operation: log.operation,
    amount: log.amount != null ? parseFloat(log.amount) : null,
    user_message: log.userMessage ?? null,
    created_at: log.createdAt.toISOString(),
  };
}

// GET /api/tasks/:id/activity
router.get("/tasks/:id/activity", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const id = parseInt(String(req.params.id));
  const params = GetTaskActivityParams.safeParse({ id });
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

  const logs = await db
    .select()
    .from(activityLogsTable)
    .where(
      and(
        eq(activityLogsTable.taskId, params.data.id),
        eq(activityLogsTable.userId, userId!),
      ),
    )
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(100);

  res.json(logs.map((log) => formatLog(log, task.title)));
});

// GET /api/activity-logs
router.get("/activity-logs", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const query = ListActivityLogsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const conditions = [eq(activityLogsTable.userId, userId!)];

  if (query.data.task_id) {
    conditions.push(eq(activityLogsTable.taskId, query.data.task_id));
  }

  if (query.data.date) {
    const day = new Date(query.data.date);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    conditions.push(gte(activityLogsTable.createdAt, day));
    conditions.push(lt(activityLogsTable.createdAt, nextDay));
  }

  const limit = query.data.limit ?? 100;

  const logs = await db
    .select({
      log: activityLogsTable,
      taskTitle: tasksTable.title,
    })
    .from(activityLogsTable)
    .leftJoin(tasksTable, eq(activityLogsTable.taskId, tasksTable.id))
    .where(and(...conditions))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(limit);

  res.json(
    logs.map(({ log, taskTitle }) =>
      formatLog(log, taskTitle ?? "Unknown Task"),
    ),
  );
});

export default router;

import { Router } from "express";
import { eq, and, count, desc, gte } from "drizzle-orm";
import { db, tasksTable, activityLogsTable } from "@workspace/db";
import { GetActivityTimelineQueryParams } from "@workspace/api-zod";

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

// GET /api/dashboard/summary
router.get("/summary",  async (req, res) => {
  const userId = "owner";
  

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.userId, userId!));

  const activeTasks = tasks.filter((t) => t.status === "active");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const totalCompleted = tasks.reduce(
    (acc, t) => acc + parseFloat(t.completedValue),
    0,
  );
  const totalRemaining = tasks.reduce((acc, t) => {
    const rem = Math.max(
      0,
      parseFloat(t.targetValue) - parseFloat(t.completedValue),
    );
    return acc + rem;
  }, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const todayLogs = await db
    .select({ cnt: count() })
    .from(activityLogsTable)
    .where(
      and(
        eq(activityLogsTable.userId, userId!),
        gte(activityLogsTable.createdAt, today),
      ),
    );

  const weekLogs = await db
    .select({ cnt: count() })
    .from(activityLogsTable)
    .where(
      and(
        eq(activityLogsTable.userId, userId!),
        gte(activityLogsTable.createdAt, weekAgo),
      ),
    );

  const taskActivityCounts = await db
    .select({
      taskId: activityLogsTable.taskId,
      cnt: count(),
    })
    .from(activityLogsTable)
    .where(eq(activityLogsTable.userId, userId!))
    .groupBy(activityLogsTable.taskId)
    .orderBy(desc(count()))
    .limit(1);

  let mostActiveTask = null;
  if (taskActivityCounts.length > 0) {
    const [taskRow] = await db
      .select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.id, taskActivityCounts[0].taskId),
          eq(tasksTable.userId, userId!),
        ),
      );
    if (taskRow) mostActiveTask = formatTask(taskRow);
  }

  res.json({
    active_task_count: activeTasks.length,
    completed_task_count: completedTasks.length,
    total_units_completed: totalCompleted,
    total_units_remaining: totalRemaining,
    today_activity_count: todayLogs[0]?.cnt ?? 0,
    week_activity_count: weekLogs[0]?.cnt ?? 0,
    most_active_task: mostActiveTask,
  });
});

// GET /api/dashboard/activity-timeline
router.get("/activity-timeline",  async (req, res) => {
  const userId = "owner";
  
  const query = GetActivityTimelineQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const days = query.data.days ?? 7;
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const logs = await db
    .select({
      log: activityLogsTable,
      taskTitle: tasksTable.title,
    })
    .from(activityLogsTable)
    .leftJoin(tasksTable, eq(activityLogsTable.taskId, tasksTable.id))
    .where(
      and(
        eq(activityLogsTable.userId, userId!),
        gte(activityLogsTable.createdAt, since),
      ),
    )
    .orderBy(desc(activityLogsTable.createdAt));

  const byDate: Record<
    string,
    Array<{
      id: number;
      task_id: number;
      task_title: string;
      operation: string;
      amount: number | null;
      user_message: string | null;
      created_at: string;
    }>
  > = {};

  for (const { log, taskTitle } of logs) {
    const date = log.createdAt.toISOString().split("T")[0];
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push({
      id: log.id,
      task_id: log.taskId,
      task_title: taskTitle ?? "Unknown Task",
      operation: log.operation,
      amount: log.amount != null ? parseFloat(log.amount) : null,
      user_message: log.userMessage ?? null,
      created_at: log.createdAt.toISOString(),
    });
  }

  const result = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLogs = byDate[dateStr] ?? [];
    result.push({
      date: dateStr,
      count: dayLogs.length,
      logs: dayLogs,
    });
  }

  res.json(result);
});

export default router;

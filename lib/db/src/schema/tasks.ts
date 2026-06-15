import {
  pgTable,
  serial,
  text,
  numeric,
  timestamp,
  pgEnum,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const taskStatusEnum = pgEnum("task_status", [
  "active",
  "completed",
  "paused",
]);

export const dueScopeEnum = pgEnum("due_scope", [
  "today",
  "this_week",
  "this_month",
  "goal",
]);

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  targetValue: numeric("target_value", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  completedValue: numeric("completed_value", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  unit: text("unit").notNull().default("units"),
  status: taskStatusEnum("status").notNull().default("active"),
  dueScope: dueScopeEnum("due_scope"),
  dueDate: date("due_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;

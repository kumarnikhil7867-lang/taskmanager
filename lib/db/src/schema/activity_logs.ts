import {
  pgTable,
  serial,
  text,
  numeric,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";

export const operationEnum = pgEnum("operation_type", [
  "add",
  "subtract",
  "set",
  "reset",
  "create",
]);

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasksTable.id, { onDelete: "cascade" }),
  operation: operationEnum("operation").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  userMessage: text("user_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(
  activityLogsTable,
).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogsTable.$inferSelect;

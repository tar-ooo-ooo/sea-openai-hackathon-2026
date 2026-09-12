import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const chatRole = pgEnum("chat_role", ["assistant", "user"]);
export const userRole = pgEnum("user_role", ["user", "admin"]);
export const applicationCategory = pgEnum("application_category", [
  "照顧及專業服務",
  "交通接送服務",
  "輔具及居家無障礙環境改善",
  "喘息服務",
]);
export const applicationServiceStatus = pgEnum("application_service_status", [
  "尚未申請",
  "已送出",
]);
export const triageUrgency = pgEnum("triage_urgency", ["follow_up", "emergency"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  nationalId: varchar("national_id", { length: 10 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  birthDate: date("birth_date").notNull(),
  area: varchar("area", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const applicationPackages = pgTable(
  "application_packages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetName: varchar("target_name", { length: 100 }).notNull(),
    summary: varchar("summary", { length: 500 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("application_packages_user_target_name_uidx").on(
      table.userId,
      table.targetName,
    ),
  ],
);

export const applicationServices = pgTable(
  "application_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationPackageId: uuid("application_package_id")
      .notNull()
      .references(() => applicationPackages.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    category: applicationCategory("category").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    reason: varchar("reason", { length: 300 }).notNull(),
    status: applicationServiceStatus("status").default("尚未申請").notNull(),
  },
  (table) => [
    uniqueIndex("application_services_package_position_uidx").on(
      table.applicationPackageId,
      table.position,
    ),
    check(
      "application_services_position_check",
      sql`${table.position} between 0 and 7`,
    ),
  ],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: chatRole("role").notNull(),
    content: varchar("content", { length: 4000 }).notNull(),
    workflowSteps: jsonb("workflow_steps").$type<string[]>(),
    applicationId: uuid("application_id").references(() => applicationPackages.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("chat_messages_user_created_at_idx").on(table.userId, table.createdAt),
    check("chat_messages_content_check", sql`char_length(${table.content}) > 0`),
  ],
);

export const emergencyTriages = pgTable(
  "emergency_triages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    urgency: triageUrgency("urgency").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("emergency_triages_user_created_at_idx").on(table.userId, table.createdAt),
  ],
);

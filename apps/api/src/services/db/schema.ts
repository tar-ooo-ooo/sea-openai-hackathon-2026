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
import type { ApplicationIntakeData } from "../../types/application-intake.ts";

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
export const applicationIntakeStatus = pgEnum("application_intake_status", [
  "collecting",
  "packaged",
]);
export const triageUrgency = pgEnum("triage_urgency", ["follow_up", "emergency"]);
export const careCaseStatus = pgEnum("care_case_status", [
  "new",
  "assessing",
  "plan_review",
  "matching",
  "following_up",
  "closed",
]);
export const careCasePriority = pgEnum("care_case_priority", ["low", "normal", "high", "urgent"]);
export const carePlanStatus = pgEnum("care_plan_status", [
  "draft",
  "in_review",
  "confirmed",
  "superseded",
]);
export const carePlanItemStatus = pgEnum("care_plan_item_status", [
  "proposed",
  "accepted",
  "rejected",
]);
export const caseTimelineEventType = pgEnum("case_timeline_event_type", [
  "case_opened",
  "assessment_saved",
  "plan_created",
  "plan_confirmed",
  "match_updated",
  "follow_up",
  "note",
  "status_changed",
]);
export const caseEventSource = pgEnum("case_event_source", ["admin", "family", "system", "ai"]);
export const caseEventSeverity = pgEnum("case_event_severity", ["info", "warning", "critical"]);
export const caseActionStatus = pgEnum("case_action_status", [
  "open",
  "in_progress",
  "resolved",
  "dismissed",
]);

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

export const adminProfiles = pgTable("admin_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  organizationName: varchar("organization_name", { length: 100 }),
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

export const applicationIntakes = pgTable(
  "application_intakes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: applicationIntakeStatus("status").default("collecting").notNull(),
    data: jsonb("data")
      .$type<ApplicationIntakeData>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    applicationPackageId: uuid("application_package_id").references(
      () => applicationPackages.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("application_intakes_user_status_idx").on(table.userId, table.status)],
);

export const careCases = pgTable(
  "care_cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceApplicationPackageId: uuid("source_application_package_id").references(
      () => applicationPackages.id,
      { onDelete: "set null" },
    ),
    familyUserId: uuid("family_user_id").references(() => users.id, { onDelete: "set null" }),
    recipientName: varchar("recipient_name", { length: 100 }).notNull(),
    recipientBirthDate: date("recipient_birth_date"),
    area: varchar("area", { length: 100 }),
    referralSummary: text("referral_summary").notNull(),
    assignedAdminId: uuid("assigned_admin_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: careCaseStatus("status").default("new").notNull(),
    priority: careCasePriority("priority").default("normal").notNull(),
    referralReceivedAt: timestamp("referral_received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("care_cases_source_application_package_uidx").on(
      table.sourceApplicationPackageId,
    ),
    index("care_cases_status_updated_at_idx").on(table.status, table.updatedAt),
    index("care_cases_assigned_admin_id_idx").on(table.assignedAdminId),
    index("care_cases_family_user_id_idx").on(table.familyUserId),
  ],
);

export const caseAssessments = pgTable(
  "case_assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    careCaseId: uuid("care_case_id")
      .notNull()
      .references(() => careCases.id, { onDelete: "cascade" }),
    cmsLevel: integer("cms_level"),
    summary: text("summary"),
    data: jsonb("data").default(sql`'{}'::jsonb`).notNull(),
    assessedAt: timestamp("assessed_at", { withTimezone: true }).defaultNow().notNull(),
    createdByAdminId: uuid("created_by_admin_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("case_assessments_case_assessed_at_idx").on(table.careCaseId, table.assessedAt),
  ],
);

export const careStateSnapshots = pgTable(
  "care_state_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    careCaseId: uuid("care_case_id")
      .notNull()
      .references(() => careCases.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 50 }).notNull(),
    dailyLiving: jsonb("daily_living").default(sql`'{}'::jsonb`).notNull(),
    careEnvironment: jsonb("care_environment").default(sql`'{}'::jsonb`).notNull(),
    familyCare: jsonb("family_care").default(sql`'{}'::jsonb`).notNull(),
    recentNeeds: jsonb("recent_needs").default(sql`'{}'::jsonb`).notNull(),
    summary: text("summary"),
    observedAt: timestamp("observed_at", { withTimezone: true }).defaultNow().notNull(),
    recordedByAdminId: uuid("recorded_by_admin_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("care_state_snapshots_case_observed_at_idx").on(table.careCaseId, table.observedAt),
  ],
);

export const carePlans = pgTable(
  "care_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    careCaseId: uuid("care_case_id")
      .notNull()
      .references(() => careCases.id, { onDelete: "cascade" }),
    sourceAssessmentId: uuid("source_assessment_id").references(() => caseAssessments.id, {
      onDelete: "set null",
    }),
    version: integer("version").notNull(),
    status: carePlanStatus("status").default("draft").notNull(),
    goal: text("goal").notNull(),
    createdByAdminId: uuid("created_by_admin_id").references(() => users.id, {
      onDelete: "set null",
    }),
    confirmedByAdminId: uuid("confirmed_by_admin_id").references(() => users.id, {
      onDelete: "set null",
    }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("care_plans_case_version_uidx").on(table.careCaseId, table.version),
    index("care_plans_case_status_idx").on(table.careCaseId, table.status),
    check("care_plans_version_check", sql`${table.version} > 0`),
  ],
);

export const carePlanItems = pgTable(
  "care_plan_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    carePlanId: uuid("care_plan_id")
      .notNull()
      .references(() => carePlans.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    serviceName: varchar("service_name", { length: 100 }).notNull(),
    objective: text("objective").notNull(),
    frequency: varchar("frequency", { length: 100 }),
    status: carePlanItemStatus("status").default("proposed").notNull(),
    aiRationale: text("ai_rationale"),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("care_plan_items_plan_position_uidx").on(table.carePlanId, table.position),
    check("care_plan_items_position_check", sql`${table.position} between 0 and 31`),
  ],
);

export const carePlanItemDecisions = pgTable(
  "care_plan_item_decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    carePlanItemId: uuid("care_plan_item_id")
      .notNull()
      .references(() => carePlanItems.id, { onDelete: "cascade" }),
    actor: varchar("actor", { length: 20 }).notNull(),
    decision: varchar("decision", { length: 20 }).notNull(),
    reason: text("reason"),
    changes: jsonb("changes").default(sql`'{}'::jsonb`).notNull(),
    recordedByAdminId: uuid("recorded_by_admin_id").references(() => users.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("care_plan_item_decisions_item_decided_at_idx").on(table.carePlanItemId, table.decidedAt),
  ],
);

export const caseTimelineEvents = pgTable(
  "case_timeline_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    careCaseId: uuid("care_case_id")
      .notNull()
      .references(() => careCases.id, { onDelete: "cascade" }),
    carePlanId: uuid("care_plan_id").references(() => carePlans.id, { onDelete: "set null" }),
    eventType: caseTimelineEventType("event_type").notNull(),
    source: caseEventSource("source").default("admin").notNull(),
    severity: caseEventSeverity("severity").default("info").notNull(),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    createdByAdminId: uuid("created_by_admin_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("case_timeline_events_case_occurred_at_idx").on(table.careCaseId, table.occurredAt),
  ],
);

export const caseActionItems = pgTable(
  "case_action_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    careCaseId: uuid("care_case_id")
      .notNull()
      .references(() => careCases.id, { onDelete: "cascade" }),
    sourceEventId: uuid("source_event_id").references(() => caseTimelineEvents.id, {
      onDelete: "set null",
    }),
    origin: caseEventSource("origin").default("admin").notNull(),
    type: varchar("type", { length: 100 }).notNull(),
    priority: careCasePriority("priority").default("normal").notNull(),
    status: caseActionStatus("status").default("open").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    assignedAdminId: uuid("assigned_admin_id").references(() => users.id, {
      onDelete: "set null",
    }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedByAdminId: uuid("resolved_by_admin_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("case_action_items_assigned_status_due_idx").on(
      table.assignedAdminId,
      table.status,
      table.dueAt,
    ),
    index("case_action_items_case_status_priority_due_idx").on(
      table.careCaseId,
      table.status,
      table.priority,
      table.dueAt,
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

export const chatSummaries = pgTable(
  "chat_summaries",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    lastMessageId: uuid("last_message_id").notNull(),
    lastMessageCreatedAt: timestamp("last_message_created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [check("chat_summaries_summary_check", sql`char_length(${table.summary}) > 0`)],
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

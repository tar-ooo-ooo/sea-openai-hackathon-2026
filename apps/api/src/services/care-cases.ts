import { randomUUID } from "node:crypto";
import type { CareCaseStatus } from "../types/care-case.ts";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "./db/client.ts";
import {
  careCases,
  carePlanItems,
  carePlans,
  careStateSnapshots,
  caseActionItems,
  caseAssessments,
  caseTimelineEvents,
} from "./db/schema.ts";

export async function recordCareCaseAction(input: {
  caseId: string; adminId: string; expectedStatus: CareCaseStatus; status: CareCaseStatus;
  eventType: "status_changed" | "note" | "follow_up"; summary: string;
}) {
  const result = await db.execute(sql`
    WITH updated AS (
      UPDATE care_cases
      SET status = ${input.status}::care_case_status, updated_at = now(),
          accepted_at = CASE
            WHEN ${input.expectedStatus} = 'new' AND ${input.status} = 'assessing' THEN now()
            ELSE accepted_at
          END,
          closed_at = CASE WHEN ${input.status} = 'closed' THEN now() ELSE closed_at END,
          assigned_admin_id = COALESCE(assigned_admin_id, ${input.adminId}::uuid)
      WHERE id = ${input.caseId}::uuid AND status = ${input.expectedStatus}::care_case_status
        AND status <> 'closed'
        AND (assigned_admin_id IS NULL OR assigned_admin_id = ${input.adminId}::uuid)
      RETURNING id
    )
    INSERT INTO case_timeline_events (care_case_id, event_type, source, summary, created_by_admin_id, metadata)
    SELECT id, ${input.eventType}::case_timeline_event_type, 'admin', ${input.summary}, ${input.adminId}::uuid,
      jsonb_build_object('previousStatus', ${input.expectedStatus}::text, 'status', ${input.status}::text)
    FROM updated RETURNING id
  `);
  return result.rows.length === 1;
}

export async function listCareCases() {
  return db
    .select({
      id: careCases.id,
      sourceApplicationPackageId: careCases.sourceApplicationPackageId,
      recipientName: careCases.recipientName,
      area: careCases.area,
      referralSummary: careCases.referralSummary,
      status: careCases.status,
      priority: careCases.priority,
      assignedAdminId: careCases.assignedAdminId,
      acceptedAt: careCases.acceptedAt,
      updatedAt: careCases.updatedAt,
    })
    .from(careCases)
    .orderBy(desc(careCases.updatedAt));
}

export async function findCareCaseById(careCaseId: string) {
  const [careCase] = await db
    .select({
      id: careCases.id,
      sourceApplicationPackageId: careCases.sourceApplicationPackageId,
      recipientName: careCases.recipientName,
      area: careCases.area,
      referralSummary: careCases.referralSummary,
      status: careCases.status,
      priority: careCases.priority,
      assignedAdminId: careCases.assignedAdminId,
      acceptedAt: careCases.acceptedAt,
      updatedAt: careCases.updatedAt,
    })
    .from(careCases)
    .where(eq(careCases.id, careCaseId))
    .limit(1);
  return careCase;
}

export async function createCaseAssessmentWithEvent(input: {
  careCaseId: string;
  cmsLevel: number | null;
  summary: string;
  adminId: string;
}) {
  const assessmentId = randomUUID();
  const result = await db.execute(sql`
    WITH updated_case AS (
      UPDATE "care_cases"
      SET "updated_at" = now(),
          "assigned_admin_id" = COALESCE("assigned_admin_id", ${input.adminId}::uuid),
          "status" = CASE WHEN "status" = 'new' THEN 'assessing'::care_case_status ELSE "status" END,
          "accepted_at" = CASE WHEN "status" = 'new' THEN now() ELSE "accepted_at" END
      WHERE "id" = ${input.careCaseId}
        AND status <> 'closed'
        AND (assigned_admin_id IS NULL OR assigned_admin_id = ${input.adminId}::uuid)
      RETURNING "id"
    ), created_assessment AS (
      INSERT INTO "case_assessments" (
        "id",
        "care_case_id",
        "cms_level",
        "summary",
        "created_by_admin_id"
      )
      SELECT ${assessmentId}, "id", ${input.cmsLevel}, ${input.summary}, ${input.adminId}
      FROM updated_case
      RETURNING "id", "care_case_id"
    )
    INSERT INTO "case_timeline_events" (
      "care_case_id",
      "event_type",
      "source",
      "severity",
      "summary",
      "created_by_admin_id"
    )
    SELECT
      "care_case_id",
      ${"assessment_saved"},
      ${"admin"},
      ${"info"},
      ${input.cmsLevel === null ? "已儲存評估摘要。" : `已儲存 CMS ${input.cmsLevel} 評估摘要。`},
      ${input.adminId}
    FROM created_assessment
    RETURNING "care_case_id"
  `);
  const [createdAssessment] = result.rows as Array<{ care_case_id: string }>;
  return createdAssessment ? assessmentId : null;
}

export async function findLatestCaseAssessment(careCaseId: string) {
  const [assessment] = await db
    .select({
      id: caseAssessments.id,
      cmsLevel: caseAssessments.cmsLevel,
      summary: caseAssessments.summary,
      assessedAt: caseAssessments.assessedAt,
    })
    .from(caseAssessments)
    .where(eq(caseAssessments.careCaseId, careCaseId))
    .orderBy(desc(caseAssessments.assessedAt))
    .limit(1);
  return assessment;
}

export async function findLatestCareStateSnapshot(careCaseId: string) {
  const [careState] = await db
    .select({
      id: careStateSnapshots.id,
      source: careStateSnapshots.source,
      summary: careStateSnapshots.summary,
      observedAt: careStateSnapshots.observedAt,
    })
    .from(careStateSnapshots)
    .where(eq(careStateSnapshots.careCaseId, careCaseId))
    .orderBy(desc(careStateSnapshots.observedAt))
    .limit(1);
  return careState;
}

export async function findLatestCarePlan(careCaseId: string) {
  const [carePlan] = await db
    .select({
      id: carePlans.id,
      version: carePlans.version,
      status: carePlans.status,
      goal: carePlans.goal,
    })
    .from(carePlans)
    .where(and(eq(carePlans.careCaseId, careCaseId), ne(carePlans.status, "superseded")))
    .orderBy(desc(carePlans.version))
    .limit(1);
  return carePlan;
}

export async function listCarePlanItems(carePlanId: string) {
  return db
    .select({
      id: carePlanItems.id,
      position: carePlanItems.position,
      category: carePlanItems.category,
      serviceName: carePlanItems.serviceName,
      objective: carePlanItems.objective,
      frequency: carePlanItems.frequency,
      status: carePlanItems.status,
    })
    .from(carePlanItems)
    .where(eq(carePlanItems.carePlanId, carePlanId))
    .orderBy(asc(carePlanItems.position));
}

export async function listCareCaseEvents(careCaseId: string) {
  return db
    .select({
      id: caseTimelineEvents.id,
      eventType: caseTimelineEvents.eventType,
      source: caseTimelineEvents.source,
      severity: caseTimelineEvents.severity,
      summary: caseTimelineEvents.summary,
      occurredAt: caseTimelineEvents.occurredAt,
    })
    .from(caseTimelineEvents)
    .where(eq(caseTimelineEvents.careCaseId, careCaseId))
    .orderBy(desc(caseTimelineEvents.occurredAt))
    .limit(20);
}

export async function listOpenCareCaseActionItems(careCaseId: string) {
  return db
    .select({
      id: caseActionItems.id,
      type: caseActionItems.type,
      priority: caseActionItems.priority,
      status: caseActionItems.status,
      title: caseActionItems.title,
      dueAt: caseActionItems.dueAt,
    })
    .from(caseActionItems)
    .where(
      and(
        eq(caseActionItems.careCaseId, careCaseId),
        inArray(caseActionItems.status, ["open", "in_progress"]),
      ),
    )
    .orderBy(asc(caseActionItems.dueAt));
}

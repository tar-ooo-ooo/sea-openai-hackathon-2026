import { fetchApi } from "@/lib/fetch-api";

export type CareCaseListItem = {
  id: string;
  sourceApplicationPackageId: string | null;
  recipientName: string;
  area: string | null;
  referralSummary: string;
  status: "new" | "assessing" | "plan_review" | "matching" | "following_up" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  assignedAdminId: string | null;
  acceptedAt: string | null;
  updatedAt: string;
};

export type CareCaseDetail = CareCaseListItem & {
  latestAssessment: { id: string; cmsLevel: number | null; summary: string | null; assessedAt: string } | null;
  latestCareState: { id: string; source: string; summary: string | null; observedAt: string } | null;
  currentPlan: {
    id: string;
    version: number;
    status: "draft" | "in_review" | "confirmed" | "superseded";
    goal: string;
    items: Array<{
      id: string;
      position: number;
      category: string;
      serviceName: string;
      objective: string;
      frequency: string | null;
      status: "proposed" | "accepted" | "rejected";
    }>;
  } | null;
  events: Array<{
    id: string;
    eventType: string;
    source: string;
    severity: string;
    summary: string;
    occurredAt: string;
  }>;
  actionItems: Array<{
    id: string;
    type: string;
    priority: "low" | "normal" | "high" | "urgent";
    status: "open" | "in_progress" | "resolved" | "dismissed";
    title: string;
    dueAt: string | null;
  }>;
};

function _headers(cookie: string) {
  return { Cookie: cookie };
}

export async function loadCareCases(cookie: string): Promise<CareCaseListItem[]> {
  const result = await fetchApi<unknown>("/api/admin/care-cases", {
    cache: "no-store",
    headers: _headers(cookie),
  });
  if (!result || typeof result !== "object" || !("cases" in result) || !Array.isArray(result.cases)
    || !result.cases.every(_isCareCaseListItem)) {
    throw new Error("Invalid care cases response");
  }
  return result.cases;
}

export async function loadCareCase(cookie: string, careCaseId: string): Promise<CareCaseDetail | null> {
  try {
    const result = await fetchApi<unknown>(`/api/admin/care-cases/${careCaseId}`, {
      cache: "no-store",
      headers: _headers(cookie),
    });
    if (!result || typeof result !== "object" || !("careCase" in result) || !_isCareCaseDetail(result.careCase)) {
      throw new Error("Invalid care case response");
    }
    return result.careCase;
  } catch (error) {
    if (error instanceof Error && error.message.endsWith("404")) return null;
    throw error;
  }
}

function _isCareCaseListItem(value: unknown): value is CareCaseListItem {
  return _isRecord(value)
    && "id" in value && typeof value.id === "string"
    && "sourceApplicationPackageId" in value
    && (typeof value.sourceApplicationPackageId === "string" || value.sourceApplicationPackageId === null)
    && "recipientName" in value && typeof value.recipientName === "string"
    && "area" in value && (typeof value.area === "string" || value.area === null)
    && "referralSummary" in value && typeof value.referralSummary === "string"
    && "status" in value && _isCareCaseStatus(value.status)
    && "priority" in value && _isCareCasePriority(value.priority)
    && "assignedAdminId" in value && (typeof value.assignedAdminId === "string" || value.assignedAdminId === null)
    && "acceptedAt" in value && (typeof value.acceptedAt === "string" || value.acceptedAt === null)
    && "updatedAt" in value && typeof value.updatedAt === "string";
}

function _isCareCaseDetail(value: unknown): value is CareCaseDetail {
  return _isCareCaseListItem(value)
    && "latestAssessment" in value
    && _isNullable(value.latestAssessment, _isAssessment)
    && "latestCareState" in value
    && _isNullable(value.latestCareState, _isCareState)
    && "currentPlan" in value
    && _isNullable(value.currentPlan, _isCarePlan)
    && "events" in value && Array.isArray(value.events) && value.events.every(_isCareCaseEvent)
    && "actionItems" in value && Array.isArray(value.actionItems) && value.actionItems.every(_isActionItem);
}

function _isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function _isNullable<T>(value: unknown, guard: (candidate: unknown) => candidate is T): value is T | null {
  return value === null || guard(value);
}

function _isCareCaseStatus(value: unknown): value is CareCaseListItem["status"] {
  return typeof value === "string" && ["new", "assessing", "plan_review", "matching", "following_up", "closed"].includes(value);
}

function _isCareCasePriority(value: unknown): value is CareCaseListItem["priority"] {
  return typeof value === "string" && ["low", "normal", "high", "urgent"].includes(value);
}

function _isAssessment(value: unknown): value is NonNullable<CareCaseDetail["latestAssessment"]> {
  return _isRecord(value)
    && typeof value.id === "string"
    && (typeof value.cmsLevel === "number" || value.cmsLevel === null)
    && (typeof value.summary === "string" || value.summary === null)
    && typeof value.assessedAt === "string";
}

function _isCareState(value: unknown): value is NonNullable<CareCaseDetail["latestCareState"]> {
  return _isRecord(value)
    && typeof value.id === "string"
    && typeof value.source === "string"
    && (typeof value.summary === "string" || value.summary === null)
    && typeof value.observedAt === "string";
}

function _isCarePlan(value: unknown): value is NonNullable<CareCaseDetail["currentPlan"]> {
  return _isRecord(value)
    && typeof value.id === "string"
    && typeof value.version === "number"
    && typeof value.status === "string"
    && typeof value.goal === "string"
    && Array.isArray(value.items)
    && value.items.every(_isCarePlanItem);
}

function _isCarePlanItem(value: unknown): value is NonNullable<CareCaseDetail["currentPlan"]>["items"][number] {
  return _isRecord(value)
    && typeof value.id === "string"
    && typeof value.position === "number"
    && typeof value.category === "string"
    && typeof value.serviceName === "string"
    && typeof value.objective === "string"
    && (typeof value.frequency === "string" || value.frequency === null)
    && typeof value.status === "string";
}

function _isCareCaseEvent(value: unknown): value is CareCaseDetail["events"][number] {
  return _isRecord(value)
    && typeof value.id === "string"
    && typeof value.eventType === "string"
    && typeof value.source === "string"
    && typeof value.severity === "string"
    && typeof value.summary === "string"
    && typeof value.occurredAt === "string";
}

function _isActionItem(value: unknown): value is CareCaseDetail["actionItems"][number] {
  return _isRecord(value)
    && typeof value.id === "string"
    && typeof value.type === "string"
    && _isCareCasePriority(value.priority)
    && typeof value.status === "string"
    && typeof value.title === "string"
    && (typeof value.dueAt === "string" || value.dueAt === null);
}

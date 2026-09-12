export type CareCaseStatus =
  | "new"
  | "assessing"
  | "plan_review"
  | "matching"
  | "following_up"
  | "closed";

export type CareCasePriority = "low" | "normal" | "high" | "urgent";

export type CareCaseListItem = {
  id: string;
  sourceApplicationPackageId: string | null;
  recipientName: string;
  area: string | null;
  referralSummary: string;
  status: CareCaseStatus;
  priority: CareCasePriority;
  assignedAdminId: string | null;
  acceptedAt: string;
  updatedAt: string;
};

export type CareCaseDetail = CareCaseListItem & {
  latestAssessment: {
    id: string;
    cmsLevel: number | null;
    summary: string | null;
    assessedAt: string;
  } | null;
  latestCareState: {
    id: string;
    source: string;
    summary: string | null;
    observedAt: string;
  } | null;
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
    priority: CareCasePriority;
    status: "open" | "in_progress" | "resolved" | "dismissed";
    title: string;
    dueAt: string | null;
  }>;
};

export type CreateCaseAssessmentInput = {
  cmsLevel?: number;
  summary: string;
};

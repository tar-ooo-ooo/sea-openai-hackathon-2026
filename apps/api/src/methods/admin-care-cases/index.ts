import type { CareCaseDetail, CareCaseListItem, CreateCaseAssessmentInput } from "../../types/care-case.ts";
import {
  createCaseAssessmentWithEvent,
  findCareCaseById,
  findLatestCarePlan,
  findLatestCareStateSnapshot,
  findLatestCaseAssessment,
  listCareCaseEvents,
  listCareCases,
  listCarePlanItems,
  listOpenCareCaseActionItems,
} from "../../services/care-cases.ts";

function _toCareCaseListItem(careCase: {
  id: string;
  sourceApplicationPackageId: string | null;
  recipientName: string;
  area: string | null;
  referralSummary: string;
  status: CareCaseListItem["status"];
  priority: CareCaseListItem["priority"];
  assignedAdminId: string | null;
  acceptedAt: Date;
  updatedAt: Date;
}): CareCaseListItem {
  return {
    ...careCase,
    acceptedAt: careCase.acceptedAt.toISOString(),
    updatedAt: careCase.updatedAt.toISOString(),
  };
}

export async function getCareCases(): Promise<CareCaseListItem[]> {
  return (await listCareCases()).map(_toCareCaseListItem);
}

export async function addCaseAssessment(
  careCaseId: string,
  input: CreateCaseAssessmentInput,
  adminId: string,
) {
  return createCaseAssessmentWithEvent({
    careCaseId,
    cmsLevel: input.cmsLevel ?? null,
    summary: input.summary.trim(),
    adminId,
  });
}

export async function getCareCase(careCaseId: string): Promise<CareCaseDetail | null> {
  const careCase = await findCareCaseById(careCaseId);
  if (!careCase) return null;

  const [latestAssessment, latestCareState, latestCarePlan, events, actionItems] = await Promise.all([
    findLatestCaseAssessment(careCaseId),
    findLatestCareStateSnapshot(careCaseId),
    findLatestCarePlan(careCaseId),
    listCareCaseEvents(careCaseId),
    listOpenCareCaseActionItems(careCaseId),
  ]);
  const planItems = latestCarePlan ? await listCarePlanItems(latestCarePlan.id) : [];

  return {
    ..._toCareCaseListItem(careCase),
    latestAssessment: latestAssessment && {
      ...latestAssessment,
      assessedAt: latestAssessment.assessedAt.toISOString(),
    },
    latestCareState: latestCareState && {
      ...latestCareState,
      observedAt: latestCareState.observedAt.toISOString(),
    },
    currentPlan: latestCarePlan && { ...latestCarePlan, items: planItems },
    events: events.map((event) => ({ ...event, occurredAt: event.occurredAt.toISOString() })),
    actionItems: actionItems.map((item) => ({
      ...item,
      dueAt: item.dueAt?.toISOString() ?? null,
    })),
  };
}

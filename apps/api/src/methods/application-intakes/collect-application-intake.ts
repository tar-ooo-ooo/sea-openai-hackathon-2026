import {
  createApplicationIntake,
  createApplicationPackage,
  findApplicationIntake,
  findCollectingApplicationIntake,
  replaceApplicationPackage,
  updateApplicationIntake,
} from "../../services/application-intakes.ts";
import type {
  ApplicationIntakeData,
  ApplicationIntakeProgress,
} from "../../types/application-intake.ts";
import { getMissingApplicationFields, getServiceCategory } from "./application-intake-rules.ts";

function _mergeData(
  current: ApplicationIntakeData,
  patch: ApplicationIntakeData,
): ApplicationIntakeData {
  return {
    ...current,
    ...patch,
    applicant: { ...current.applicant, ...patch.applicant },
    recipient: { ...current.recipient, ...patch.recipient },
    careContext: { ...current.careContext, ...patch.careContext },
    intake: { ...current.intake, ...patch.intake },
    consent: { ...current.consent, ...patch.consent },
    precheck: { ...current.precheck, ...patch.precheck },
  };
}

function _buildApplicationPackage(data: ApplicationIntakeData) {
  const reason = `${data.careContext!.recentEvent}；${data.careContext!.goal}`.slice(0, 300);

  return {
    targetName: data.recipient!.name!.slice(0, 100),
    summary: `目前狀況：${data.careContext!.recentEvent}；希望協助：${data.careContext!.goal}`.slice(
      0,
      500,
    ),
    services: data.intake!.requestedServices!.map((name) => ({
      category: getServiceCategory(name),
      name,
      reason,
    })),
  };
}

export async function getOrCreateApplicationIntake(userId: string) {
  return (await findCollectingApplicationIntake(userId)) ?? createApplicationIntake(userId);
}

export async function collectApplicationIntake(
  userId: string,
  intakeId: string,
  current: ApplicationIntakeData,
  patch: ApplicationIntakeData,
): Promise<ApplicationIntakeProgress> {
  const data = _mergeData(current, patch);
  await updateApplicationIntake(intakeId, userId, data);
  const missingFields = getMissingApplicationFields(data);

  return {
    status: missingFields.length > 0 ? "collecting" : "ready",
    missingFields,
  };
}

export async function getApplicationIntakeForReview(userId: string, intakeId: string) {
  const intake = await findApplicationIntake(intakeId, userId);
  return intake?.status === "collecting" ? { id: intake.id, data: intake.data } : null;
}

export async function submitApplicationIntake(
  userId: string,
  intakeId: string,
  patch: ApplicationIntakeData,
): Promise<ApplicationIntakeProgress | null> {
  const intake = await findApplicationIntake(intakeId, userId);
  if (!intake) return null;
  if (intake.applicationPackageId) {
    return {
      status: "packaged",
      missingFields: [],
      applicationPackageId: intake.applicationPackageId,
    };
  }

  if (intake.status !== "collecting") return null;
  const data = _mergeData(intake.data, patch);
  const missingFields = getMissingApplicationFields(data);
  if (missingFields.length > 0) return { status: "collecting", missingFields };

  const packageId = await createApplicationPackage({
    intakeId,
    userId,
    data,
    ..._buildApplicationPackage(data),
  });

  return { status: "packaged", missingFields: [], applicationPackageId: packageId };
}

export async function updateApplicationPackage(
  userId: string,
  intakeId: string,
  patch: ApplicationIntakeData,
): Promise<ApplicationIntakeProgress> {
  const intake = await findApplicationIntake(intakeId, userId);
  if (!intake?.applicationPackageId) throw new Error("Application package not found");

  const data = _mergeData(intake.data, patch);
  const missingFields = getMissingApplicationFields(data);
  if (missingFields.length > 0) return { status: "collecting", missingFields };

  await replaceApplicationPackage({
    intakeId,
    applicationPackageId: intake.applicationPackageId,
    userId,
    data,
    ..._buildApplicationPackage(data),
  });

  return {
    status: "packaged",
    missingFields: [],
    applicationPackageId: intake.applicationPackageId,
  };
}

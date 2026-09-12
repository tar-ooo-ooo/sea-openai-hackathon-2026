import {
  createApplicationIntake,
  createApplicationPackage,
  findCollectingApplicationIntake,
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

  if (missingFields.length > 0) return { status: "collecting", missingFields };

  const requestedServices = data.intake!.requestedServices!;
  const reason = `${data.careContext!.recentEvent}；${data.careContext!.goal}`.slice(0, 300);
  const packageId = await createApplicationPackage({
    intakeId,
    userId,
    targetName: data.recipient!.name!.slice(0, 100),
    summary: `目前狀況：${data.careContext!.recentEvent}；希望協助：${data.careContext!.goal}`.slice(
      0,
      500,
    ),
    services: requestedServices.map((name) => ({
      category: getServiceCategory(name),
      name,
      reason,
    })),
  });

  return { status: "packaged", missingFields: [], applicationPackageId: packageId };
}

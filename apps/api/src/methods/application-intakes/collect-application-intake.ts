import {
  createApplicationIntake,
  createApplicationPackage,
  findApplicationIntake,
  findCollectingApplicationIntake,
  replaceApplicationPackage,
  saveApplicationFormReview,
  updateApplicationIntake,
} from "../../services/application-intakes.ts";
import { reviewApplicationForm } from "../../services/openai/chat-agent.ts";
import type {
  ApplicationIntakeData,
  ApplicationIntakeProgress,
} from "../../types/application-intake.ts";
import {
  getMissingApplicationFields,
  getServiceCategory,
  normalizeApplicationIntakeData,
} from "./application-intake-rules.ts";

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

function _listDataFields(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return value.length > 0 && prefix ? [prefix] : [];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      _listDataFields(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return value !== undefined && value !== null && value !== "" && prefix ? [prefix] : [];
}

function _pickDataFields(data: ApplicationIntakeData, fields: string[]): ApplicationIntakeData {
  const source = data as Record<string, unknown>;
  const picked: Record<string, unknown> = {};
  for (const path of fields) {
    const [section, field, ...rest] = path.split(".");
    if ([section, field].some((key) => key === "__proto__" || key === "constructor")) continue;
    if (!field) {
      picked[section] = source[section];
    } else if (rest.length === 0) {
      const sectionData = source[section];
      if (sectionData && typeof sectionData === "object" && !Array.isArray(sectionData)) {
        const sectionFields = (picked[section] as Record<string, unknown> | undefined) ?? {};
        sectionFields[field] = (sectionData as Record<string, unknown>)[field];
        picked[section] = sectionFields;
      }
    }
  }
  return picked as ApplicationIntakeData;
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
  if (intake?.status !== "collecting") return null;
  const data = normalizeApplicationIntakeData(intake.data);
  return {
    id: intake.id,
    data: _pickDataFields(
      data,
      intake.formReview?.prefillFields ??
        _listDataFields(data).filter((field) => !field.startsWith("consent.")),
    ),
  };
}

export async function getApplicationIntakeForComputer(userId: string, intakeId: string) {
  const intake = await findApplicationIntake(intakeId, userId);
  return intake ? { id: intake.id, status: intake.status } : null;
}

export async function prepareApplicationForm(
  userId: string,
  intakeId: string,
): Promise<ApplicationIntakeProgress> {
  const intake = await findApplicationIntake(intakeId, userId);
  if (!intake || intake.status !== "collecting") {
    throw new Error("Application intake not found");
  }
  const data = normalizeApplicationIntakeData(intake.data);
  const missingFields = getMissingApplicationFields(data);
  if (missingFields.length > 0) return { status: "collecting", missingFields };

  const availableFields = _listDataFields(data).filter(
    (field) => !field.startsWith("consent."),
  );
  const review = await reviewApplicationForm(data, availableFields);
  const availableFieldSet = new Set(availableFields);
  const selfFields = data.applicantRole === "SELF"
    ? ["applicantRole", "applicant.name", "applicant.nationalId", "recipient.name", "recipient.nationalId"]
    : [];
  const prefillFields = [...new Set([...review.prefillFields, ...selfFields])].filter((field) =>
    availableFieldSet.has(field),
  );
  if (prefillFields.length === 0) throw new Error("Form review selected no fields");

  const formReview = { prefillFields };
  await saveApplicationFormReview(intake.id, userId, formReview);
  return { status: "ready", missingFields: [], formReview };
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
  const data = normalizeApplicationIntakeData(_mergeData(intake.data, patch));
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

  const data = normalizeApplicationIntakeData(_mergeData(intake.data, patch));
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

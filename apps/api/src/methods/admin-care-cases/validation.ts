import type { CreateCaseAssessmentInput } from "../../types/care-case.ts";

const _uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidCareCaseId(careCaseId: string) {
  return _uuidPattern.test(careCaseId);
}

export function isCreateCaseAssessmentInput(value: unknown): value is CreateCaseAssessmentInput {
  if (!value || typeof value !== "object" || !("summary" in value) || typeof value.summary !== "string") {
    return false;
  }
  if (Object.keys(value).some((key) => key !== "cmsLevel" && key !== "summary")) return false;
  if (value.summary.trim().length === 0 || value.summary.length > 4000) return false;
  return !("cmsLevel" in value)
    || (typeof value.cmsLevel === "number" && Number.isInteger(value.cmsLevel)
      && value.cmsLevel >= 0 && value.cmsLevel <= 99);
}

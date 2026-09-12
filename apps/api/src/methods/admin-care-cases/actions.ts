import { z } from "zod";
import type { CaseActionInput } from "../../types/care-case.ts";

export const caseActionSchema = z.object({
  action: z.enum(["start", "note", "follow_up", "close"]),
  summary: z.string().trim().min(1).max(4000),
  expectedStatus: z.enum(["new", "assessing", "plan_review", "matching", "following_up", "closed"]),
}).strict();

export function isAllowedCaseAction(input: CaseActionInput) {
  if (input.expectedStatus === "closed") return false;
  return input.action !== "start" || input.expectedStatus === "new";
}

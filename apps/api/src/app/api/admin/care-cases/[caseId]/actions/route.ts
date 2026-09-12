import type { NextRequest } from "next/server";
import { handleCaseAction } from "../../../../../../functions/admin-care-cases/actions.ts";

export async function POST(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  return handleCaseAction(request, (await context.params).caseId);
}

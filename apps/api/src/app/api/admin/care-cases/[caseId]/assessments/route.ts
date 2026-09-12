import type { NextRequest } from "next/server";

import { handleAdminCareCaseAssessments } from "../../../../../../functions/admin-care-cases";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> },
) {
  return handleAdminCareCaseAssessments(request, (await context.params).caseId);
}

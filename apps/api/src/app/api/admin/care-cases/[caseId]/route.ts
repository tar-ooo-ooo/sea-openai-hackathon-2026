import type { NextRequest } from "next/server";

import { handleAdminCareCase } from "../../../../../functions/admin-care-cases";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> },
) {
  return handleAdminCareCase(request, (await context.params).caseId);
}

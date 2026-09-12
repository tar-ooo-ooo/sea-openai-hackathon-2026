import type { NextRequest } from "next/server";

import { handleAdminCase } from "../../../../../functions/admin-cases";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> },
) {
  return handleAdminCase(request, (await context.params).caseId);
}

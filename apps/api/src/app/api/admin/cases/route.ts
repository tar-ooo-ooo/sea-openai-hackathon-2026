import type { NextRequest } from "next/server";

import { handleAdminCases } from "../../../../functions/admin-cases";

export async function GET(request: NextRequest) {
  return handleAdminCases(request);
}

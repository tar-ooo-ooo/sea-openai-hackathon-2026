import type { NextRequest } from "next/server";

import { handleAdminCareCases } from "../../../../functions/admin-care-cases/index.ts";

export async function GET(request: NextRequest) {
  return handleAdminCareCases(request);
}


import type { NextRequest } from "next/server";

import { handleAdminAuth } from "../../../../functions/admin-auth";

export async function GET(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  return handleAdminAuth(request, (await context.params).action);
}

export const POST = GET;

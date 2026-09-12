import type { NextRequest } from "next/server";
import { handleUserAuth } from "../../../../functions/user-auth";

export async function GET(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  return handleUserAuth(request, (await context.params).action);
}

export const POST = GET;
export const OPTIONS = GET;

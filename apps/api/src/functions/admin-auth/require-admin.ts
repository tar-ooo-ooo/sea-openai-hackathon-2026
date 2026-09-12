import { NextRequest, NextResponse } from "next/server.js";

import { isAllowedAdminOrigin } from "../../lib/allowed-origin.ts";
import { getCurrentAdmin } from "../../methods/user-auth/index.ts";

export const adminSessionCookieName = "care_admin_session";

export async function requireAdmin(request: NextRequest, requireOrigin = false) {
  const origin = request.headers.get("origin");
  const allowed = isAllowedAdminOrigin(origin);
  if ((origin && !allowed) || (requireOrigin && !allowed)) {
    return {
      response: NextResponse.json(
        { error: origin ? "Origin is not allowed" : "Origin is required" },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  const admin = await getCurrentAdmin(request.cookies.get(adminSessionCookieName)?.value);
  if (!admin) {
    return {
      response: NextResponse.json(
        { error: "Administrator authentication is required" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  return { admin };
}

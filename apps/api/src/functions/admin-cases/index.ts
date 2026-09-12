import { NextRequest, NextResponse } from "next/server.js";

import { isAllowedOrigin } from "../../lib/allowed-origin.ts";
import { getAdminCase, getAdminCases } from "../../methods/admin-cases/index.ts";
import { isValidAdminCaseId } from "../../methods/admin-cases/validation.ts";
import { getCurrentAdmin } from "../../methods/user-auth/index.ts";

const _cookieName = "care_admin_session";

async function _getAuthenticatedResponse(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin)) {
    return NextResponse.json({ error: "Origin is not allowed" }, { status: 403 });
  }

  const admin = await getCurrentAdmin(request.cookies.get(_cookieName)?.value);
  if (!admin) return NextResponse.json({ error: "Administrator authentication is required" }, { status: 401 });

  return null;
}

export async function handleAdminCases(request: NextRequest) {
  if (request.method !== "GET") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const authenticationError = await _getAuthenticatedResponse(request);
    if (authenticationError) return authenticationError;

    return NextResponse.json({ cases: await getAdminCases() }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Case service is unavailable" }, { status: 503 });
  }
}

export async function handleAdminCase(request: NextRequest, caseId: string) {
  if (request.method !== "GET") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  if (!isValidAdminCaseId(caseId)) {
    return NextResponse.json({ error: "Invalid case ID" }, { status: 400 });
  }

  try {
    const authenticationError = await _getAuthenticatedResponse(request);
    if (authenticationError) return authenticationError;

    const adminCase = await getAdminCase(caseId);
    if (!adminCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    return NextResponse.json({ case: adminCase }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Case service is unavailable" }, { status: 503 });
  }
}

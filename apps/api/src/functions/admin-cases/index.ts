import { NextRequest, NextResponse } from "next/server.js";

import { requireAdmin } from "../admin-auth/require-admin.ts";
import { getAdminCase, getAdminCases } from "../../methods/admin-cases/index.ts";
import { isValidAdminCaseId } from "../../methods/admin-cases/validation.ts";

export async function handleAdminCases(request: NextRequest) {
  if (request.method !== "GET") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const authentication = await requireAdmin(request);
    if ("response" in authentication) return authentication.response;

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
    const authentication = await requireAdmin(request);
    if ("response" in authentication) return authentication.response;

    const adminCase = await getAdminCase(caseId);
    if (!adminCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    return NextResponse.json({ case: adminCase }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Case service is unavailable" }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from "next/server.js";
import { requireAdmin } from "../admin-auth/require-admin.ts";
import { getAdminTriages } from "../../methods/admin-triages/index.ts";

export async function handleAdminTriages(
  request: NextRequest,
  authenticate: typeof requireAdmin = requireAdmin,
  list: typeof getAdminTriages = getAdminTriages,
) {
  try {
    const authentication = await authenticate(request);
    if ("response" in authentication) return authentication.response;
    return NextResponse.json({ triages: await list() }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Triage service is unavailable" }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}

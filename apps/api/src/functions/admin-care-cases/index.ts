import { NextRequest, NextResponse } from "next/server.js";

import { requireAdmin } from "../admin-auth/require-admin.ts";
import type { CreateCaseAssessmentInput } from "../../types/care-case.ts";
import {
  isCreateCaseAssessmentInput,
  isValidCareCaseId,
} from "../../methods/admin-care-cases/validation.ts";

const _maxBodyBytes = 16 * 1024;

async function _readAssessmentInput(
  request: NextRequest,
): Promise<CreateCaseAssessmentInput | "too-large" | null> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > _maxBodyBytes) {
      await reader.cancel();
      return "too-large";
    }
    chunks.push(value);
  }

  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return isCreateCaseAssessmentInput(body) ? body : null;
  } catch {
    return null;
  }
}

export async function handleAdminCareCases(request: NextRequest) {
  if (request.method !== "GET") {
    return NextResponse.json({ error: "Method not allowed" }, {
      status: 405, headers: { Allow: "GET", "Cache-Control": "no-store" },
    });
  }

  try {
    const authentication = await requireAdmin(request);
    if ("response" in authentication) return authentication.response;

    const { getCareCases } = await import("../../methods/admin-care-cases/index.ts");
    return NextResponse.json({ cases: await getCareCases() }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Care case service is unavailable" }, { status: 503 });
  }
}

export async function handleAdminCareCase(request: NextRequest, careCaseId: string) {
  if (request.method !== "GET") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  if (!isValidCareCaseId(careCaseId)) {
    return NextResponse.json({ error: "Invalid care case ID" }, { status: 400 });
  }

  try {
    const authentication = await requireAdmin(request);
    if ("response" in authentication) return authentication.response;

    const { getCareCase } = await import("../../methods/admin-care-cases/index.ts");
    const careCase = await getCareCase(careCaseId);
    if (!careCase) return NextResponse.json({ error: "Care case not found" }, { status: 404 });

    return NextResponse.json({ careCase }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Care case service is unavailable" }, { status: 503 });
  }
}

export async function handleAdminCareCaseAssessments(request: NextRequest, careCaseId: string) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  if (!isValidCareCaseId(careCaseId)) {
    return NextResponse.json({ error: "Invalid care case ID" }, { status: 400 });
  }

  try {
    const authentication = await requireAdmin(request, true);
    if ("response" in authentication) return authentication.response;

    const input = await _readAssessmentInput(request);
    if (input === "too-large") {
      return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
    }
    if (!input) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

    const { addCaseAssessment } = await import("../../methods/admin-care-cases/index.ts");
    const assessmentId = await addCaseAssessment(careCaseId, input, authentication.admin.id);
    if (!assessmentId) return NextResponse.json({ error: "Care case not found" }, { status: 404 });

    return NextResponse.json({ assessment: { id: assessmentId } }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Care case service is unavailable" }, { status: 503 });
  }
}

import { NextRequest } from "next/server.js";
import { z } from "zod";
import { getCurrentUser } from "../../methods/user-auth/index.ts";
import {
  getApplicationIntakeForComputer,
  getApplicationIntakeForReview,
  submitApplicationIntake,
} from "../../methods/application-intakes/collect-application-intake.ts";
import { applicationIntakeDataSchema } from "../../types/application-intake.ts";
import { openApplicationWithComputer } from "../../services/openai/application-computer.ts";

const _uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const _submissionSchema = z.object({
  confirmed: z.literal(true),
  data: applicationIntakeDataSchema,
});

export async function handleGetApplicationIntake(
  request: Request,
  id: string,
  getUser = getCurrentUser,
  get = getApplicationIntakeForReview,
) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const token = new NextRequest(request.url, { headers: request.headers }).cookies.get("care_user_session")?.value;
    const user = await getUser(token);
    if (!user) return Response.json({ error: "請先登入。" }, { status: 401, headers });
    if (user.role !== "user") return Response.json({ error: "無法存取使用者申請。" }, { status: 403, headers });
    if (!_uuidPattern.test(id) || new URL(request.url).search) {
      return Response.json({ error: "無效的查詢參數。" }, { status: 400, headers });
    }
    const intake = await get(user.id, id.toLowerCase());
    if (!intake) return Response.json({ error: "找不到此申請草稿。" }, { status: 404, headers });
    return Response.json({ intake }, { headers });
  } catch {
    return Response.json({ error: "暫時無法讀取申請資料，請稍後重試。" }, { status: 503, headers });
  }
}

export async function handleSubmitApplicationIntake(
  request: Request,
  id: string,
  getUser = getCurrentUser,
  submit = submitApplicationIntake,
) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const token = new NextRequest(request.url, { headers: request.headers }).cookies.get("care_user_session")?.value;
    const user = await getUser(token);
    if (!user) return Response.json({ error: "請先登入。" }, { status: 401, headers });
    if (user.role !== "user") return Response.json({ error: "無法送出使用者申請。" }, { status: 403, headers });
    if (!_uuidPattern.test(id) || new URL(request.url).search) {
      return Response.json({ error: "無效的查詢參數。" }, { status: 400, headers });
    }
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return Response.json({ error: "Content-Type 必須是 application/json。" }, { status: 415, headers });
    }
    if (Number(request.headers.get("content-length")) > 50_000) {
      return Response.json({ error: "申請資料過大。" }, { status: 413, headers });
    }
    let body: unknown;
    try {
      const text = await request.text();
      if (text.length > 50_000) {
        return Response.json({ error: "申請資料過大。" }, { status: 413, headers });
      }
      body = JSON.parse(text);
    } catch {
      return Response.json({ error: "申請資料必須是有效的 JSON。" }, { status: 400, headers });
    }
    const parsed = _submissionSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "申請資料格式錯誤或尚未確認送出。" }, { status: 400, headers });
    }
    const result = await submit(user.id, id.toLowerCase(), parsed.data.data);
    if (!result) return Response.json({ error: "找不到此申請草稿。" }, { status: 404, headers });
    if (result.status !== "packaged") {
      return Response.json(
        { error: "申請資料尚未完整。", missingFields: result.missingFields },
        { status: 422, headers },
      );
    }
    return Response.json({ applicationPackageId: result.applicationPackageId }, { headers });
  } catch {
    return Response.json({ error: "暫時無法送出申請，請稍後重試。" }, { status: 503, headers });
  }
}

export async function handleOpenApplicationComputer(
  request: Request,
  id: string,
  getUser = getCurrentUser,
  get = getApplicationIntakeForComputer,
  open = openApplicationWithComputer,
) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const token = new NextRequest(request.url, { headers: request.headers }).cookies.get("care_user_session")?.value;
    const user = await getUser(token);
    if (!user || !token) return Response.json({ error: "請先登入。" }, { status: 401, headers });
    if (user.role !== "user") return Response.json({ error: "無法存取使用者申請。" }, { status: 403, headers });
    if (!_uuidPattern.test(id) || new URL(request.url).search) {
      return Response.json({ error: "無效的查詢參數。" }, { status: 400, headers });
    }
    const intakeId = id.toLowerCase();
    const intake = await get(user.id, intakeId);
    if (!intake) {
      return Response.json({ error: "找不到此申請草稿。" }, { status: 404, headers });
    }
    if (intake.status !== "collecting") {
      return Response.json({ error: "這份申請已建立正式案件，不能再次啟動代填。" }, { status: 409, headers });
    }
    await open(`http://localhost:3003/apply/${intakeId}`, token);
    return Response.json({ opened: true }, { headers });
  } catch {
    return Response.json({ error: "暫時無法啟動申請操作視窗，請稍後重試。" }, { status: 503, headers });
  }
}

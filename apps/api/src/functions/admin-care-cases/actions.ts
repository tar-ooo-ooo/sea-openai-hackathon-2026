import { NextRequest, NextResponse } from "next/server.js";
import { requireAdmin } from "../admin-auth/require-admin.ts";
import { caseActionSchema } from "../../methods/admin-care-cases/actions.ts";
import { isValidCareCaseId } from "../../methods/admin-care-cases/validation.ts";

export async function handleCaseAction(request: NextRequest, caseId: string) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const auth = await requireAdmin(request, true);
    if ("response" in auth) return auth.response;
    if (!isValidCareCaseId(caseId)) return NextResponse.json({ error: "無效個案編號" }, { status: 400, headers });
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
      return NextResponse.json({ error: "請使用 JSON" }, { status: 415, headers });
    }
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "缺少操作資料" }, { status: 400, headers });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 20000) {
        await reader.cancel();
        return NextResponse.json({ error: "內容過長" }, { status: 413, headers });
      }
      chunks.push(value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return NextResponse.json({ error: "無效 JSON" }, { status: 400, headers }); }
    const input = caseActionSchema.safeParse(body);
    if (!input.success) return NextResponse.json({ error: "請填寫有效操作與紀錄" }, { status: 400, headers });
    const { performCaseAction } = await import("../../methods/admin-care-cases/index.ts");
    if (!await performCaseAction(caseId, input.data, auth.admin.id)) {
      return NextResponse.json({ error: "個案不存在、已由其他專員承辦或狀態已改變，請重新整理" }, { status: 409, headers });
    }
    return NextResponse.json({ success: true }, { headers });
  } catch {
    return NextResponse.json({ error: "暫時無法儲存，請重新整理確認紀錄後再試" }, { status: 503, headers });
  }
}

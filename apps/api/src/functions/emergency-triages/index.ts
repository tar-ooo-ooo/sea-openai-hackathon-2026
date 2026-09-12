import { NextRequest } from "next/server.js";
import { z } from "zod";
import { isAllowedOrigin } from "../../lib/allowed-origin.ts";
import { getCurrentUser, userSessionCookieName } from "../../methods/user-auth/index.ts";
import { evaluateEmergencyTriage } from "../../methods/emergency-triages/index.ts";

const _input = z.object({
  message: z.string().min(1).max(4000).refine((value) => value.trim().length > 0),
}).strict();

export async function handleEmergencyTriage(request: Request, getUser = getCurrentUser, evaluate = evaluateEmergencyTriage) {
  const respond = (body: unknown, status = 200) => Response.json(body, {
    status, headers: { "Cache-Control": "no-store" },
  });
  if (request.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  if (!isAllowedOrigin(request.headers.get("origin"))) return respond({ error: "來源不允許。" }, 403);
  if (new URL(request.url).search) return respond({ error: "不接受查詢參數。" }, 400);
  try {
    const token = new NextRequest(request.url, { headers: request.headers }).cookies.get(userSessionCookieName)?.value;
    const user = await getUser(token);
    if (!user) return respond({ error: "請先登入。" }, 401);
    if (user.role !== "user") return respond({ error: "僅使用者可提交分流訊息。" }, 403);
    let body: unknown;
    try { body = await request.json(); } catch { return respond({ error: "無效的 JSON。" }, 400); }
    const parsed = _input.safeParse(body);
    if (!parsed.success) return respond({ error: "請提供 1 至 4000 字的非空白 message，且不可指定使用者或分級。" }, 400);
    return respond(await evaluate(user.id, parsed.data.message));
  } catch {
    // Do not log health text, upstream errors, credentials or model output.
    return respond({ error: "無法完成分流或確認儲存結果；這不代表沒有風險，也不代表已通報。" }, 503);
  }
}

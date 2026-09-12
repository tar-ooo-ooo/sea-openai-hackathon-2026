import { NextRequest } from "next/server.js";
import { z } from "zod";
import { isAllowedOrigin } from "../../lib/allowed-origin.ts";
import { getCurrentUser, userSessionCookieName } from "../../methods/user-auth/index.ts";
import { getProfile, updateProfile } from "../../methods/profile/index.ts";

const _input = z.object({
  name: z.string().trim().min(1).max(100),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(value + "T00:00:00Z");
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(new Date());
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
      && value >= "1900-01-01" && value <= today;
  }),
  area: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(6).max(20).regex(/^\+?[0-9 ()-]+$/)
    .refine((value) => value.replace(/\D/g, "").length >= 6),
}).strict();

export async function handleProfile(request: Request, getUser = getCurrentUser, read = getProfile, save = updateProfile) {
  const headers = { "Cache-Control": "no-store" };
  const respond = (body: unknown, status = 200) => Response.json(body, { status, headers });
  if (request.method !== "GET" && request.method !== "PUT") return respond({ error: "Method not allowed" }, 405);
  if (request.method === "PUT" && !isAllowedOrigin(request.headers.get("origin"))) {
    return respond({ error: "來源不允許。" }, 403);
  }
  try {
    const token = new NextRequest(request.url, { headers: request.headers }).cookies.get(userSessionCookieName)?.value;
    const user = await getUser(token);
    if (!user) return respond({ error: "請先登入。" }, 401);
    if (user.role !== "user") return respond({ error: "無法存取使用者個人檔案。" }, 403);
    if (new URL(request.url).search) return respond({ error: "不接受查詢參數。" }, 400);
    if (request.method === "GET") return respond({ profile: await read(user.id) });
    let body: unknown;
    try { body = await request.json(); } catch { return respond({ error: "無效的 JSON。" }, 400); }
    const parsed = _input.safeParse(body);
    if (!parsed.success) return respond({ error: "請檢查姓名、生日、地區與電話格式。生日須為 1900 年起的有效日期且不可晚於今天。" }, 400);
    return respond({ profile: await save(user.id, parsed.data) });
  } catch {
    return respond({ error: "暫時無法讀取或儲存個人檔案，請稍後再試。" }, 503);
  }
}

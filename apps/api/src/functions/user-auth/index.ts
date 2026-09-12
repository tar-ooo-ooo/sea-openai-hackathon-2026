import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, getCurrentUser } from "../../methods/user-auth";
import { isValidNationalId, isValidPassword } from "../../methods/user-auth/credentials";

const _cookieName = "care_user_session";
// 單一 API process 的 MVP 限流，避免無限制執行昂貴密碼雜湊。
let _attempts = 0;
let _windowStart = 0;

function _allowedOrigins(): string[] {
  return process.env.NODE_ENV === "production"
    ? (process.env.USER_AUTH_ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean)
    : ["http://localhost:3000", "http://localhost:3001"];
}

export async function handleUserAuth(request: NextRequest, action: string) {
  const origin = request.headers.get("origin");
  const allowed = !!origin && _allowedOrigins().includes(origin);
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Origin" });
  if (allowed) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers });
  if (!["login", "register", "session", "logout"].includes(action)) return reply({ error: "找不到此功能。" }, 404);
  if (origin && !allowed) return reply({ error: "不允許此來源。" }, 403);
  if (request.method === "OPTIONS") return new NextResponse(null, { status: allowed ? 204 : 403, headers });
  try {
    if (action === "session" && request.method === "GET") {
      return reply({ user: await getCurrentUser(request.cookies.get(_cookieName)?.value) });
    }
    if (request.method !== "POST" || action === "session") return reply({ error: "不支援此操作。" }, 405);
    // 所有 cookie 寫入都要求明確可信 Origin，防止跨站登入／登出。
    if (!allowed) return reply({ error: "不允許此來源。" }, 403);
    const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 8 * 60 * 60 };
    if (action === "logout") {
      const response = reply({ ok: true });
      response.cookies.set(_cookieName, "", { ...cookieOptions, maxAge: 0 });
      return response;
    }
    const now = Date.now();
    if (now - _windowStart >= 60_000) { _windowStart = now; _attempts = 0; }
    if (++_attempts > 30) return reply({ error: "嘗試次數過多，請稍後再試。" }, 429);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "請使用 JSON。" }, 415);
    // 逐段限制 body，不能只信任 Content-Length。
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "請填寫登入資料。" }, 400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2048) { await reader.cancel(); return reply({ error: "輸入內容過長。" }, 413); }
      chunks.push(value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return reply({ error: "輸入格式有誤。" }, 400); }
    if (!body || typeof body !== "object" || !("nationalId" in body) || !("password" in body)
      || typeof body.nationalId !== "string" || typeof body.password !== "string") return reply({ error: "請填寫登入資料。" }, 400);
    const nationalId = body.nationalId.trim().toUpperCase();
    if (!isValidNationalId(nationalId) || !isValidPassword(body.password)) return reply({ error: "請檢查身分證字號與密碼格式。" }, 400);
    const result = await authenticateUser(nationalId, body.password, action === "register");
    if (!result) return reply({ error: action === "register" ? "無法建立帳號，請嘗試登入。" : "身分證字號或密碼錯誤。" }, action === "register" ? 409 : 401);
    const response = reply({ user: result.user }, action === "register" ? 201 : 200);
    response.cookies.set(_cookieName, result.token, cookieOptions);
    return response;
  } catch {
    // 不將資料庫例外、帳密或連線資訊回傳或輸出至 log。
    return reply({ error: "目前無法完成操作，請稍後再試。" }, 503);
  }
}

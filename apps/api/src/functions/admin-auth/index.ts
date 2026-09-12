import { NextRequest, NextResponse } from "next/server.js";

import { isAllowedAdminOrigin } from "../../lib/allowed-origin";
import { authenticateAdmin, getCurrentAdmin } from "../../methods/user-auth";
import { isValidNationalId, isValidPassword } from "../../methods/user-auth/credentials";
import { adminSessionCookieName } from "./require-admin";

let _attempts = 0;
let _windowStart = 0;

export async function handleAdminAuth(request: NextRequest, action: string) {
  const origin = request.headers.get("origin");
  const allowed = isAllowedAdminOrigin(origin);
  const headers = new Headers({ "Cache-Control": "no-store" });
  const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers });

  if (!["login", "session", "logout"].includes(action)) {
    return reply({ error: "Unsupported action" }, 404);
  }
  if (origin && !allowed) return reply({ error: "Origin is not allowed" }, 403);

  try {
    if (action === "session" && request.method === "GET") {
      return reply({ admin: await getCurrentAdmin(request.cookies.get(adminSessionCookieName)?.value) });
    }
    if (request.method !== "POST" || action === "session") {
      return reply({ error: "Method not allowed" }, 405);
    }
    if (!allowed) return reply({ error: "Origin is required" }, 403);

    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 8 * 60 * 60,
    };
    if (action === "logout") {
      const response = reply({ ok: true });
      response.cookies.set(adminSessionCookieName, "", { ...cookieOptions, maxAge: 0 });
      return response;
    }

    const now = Date.now();
    if (now - _windowStart >= 60_000) {
      _windowStart = now;
      _attempts = 0;
    }
    if (++_attempts > 30) return reply({ error: "Too many login attempts" }, 429);
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return reply({ error: "Content-Type must be application/json" }, 415);
    }

    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Invalid credentials" }, 400);

    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2048) {
        await reader.cancel();
        return reply({ error: "Request body is too large" }, 413);
      }
      chunks.push(value);
    }

    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return reply({ error: "Invalid credentials" }, 400);
    }
    if (!body || typeof body !== "object" || !("nationalId" in body) || !("password" in body)
      || typeof body.nationalId !== "string" || typeof body.password !== "string") {
      return reply({ error: "Invalid credentials" }, 400);
    }

    const nationalId = body.nationalId.trim().toUpperCase();
    if (!isValidNationalId(nationalId) || !isValidPassword(body.password)) {
      return reply({ error: "Invalid credentials" }, 400);
    }

    const result = await authenticateAdmin(nationalId, body.password);
    if (!result) return reply({ error: "Invalid administrator credentials" }, 401);

    const response = reply({ admin: result.user });
    response.cookies.set(adminSessionCookieName, result.token, cookieOptions);
    return response;
  } catch {
    return reply({ error: "Authentication service is unavailable" }, 503);
  }
}

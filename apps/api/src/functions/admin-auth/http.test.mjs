import assert from "node:assert/strict";
import { test } from "node:test";

test("admin auth 不提供公開註冊，並使用獨立 session cookie", {
  skip: process.env.ADMIN_AUTH_HTTP_TEST !== "1",
}, async () => {
  const base = "http://localhost:3002/api/admin-auth";
  const headers = { Origin: "http://localhost:3001", "Content-Type": "application/json" };

  const session = await fetch(`${base}/session`);
  assert.equal(session.status, 200);
  assert.deepEqual(await session.json(), { admin: null });

  const registration = await fetch(`${base}/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({ nationalId: "A123456789", password: "Example123" }),
  });
  assert.equal(registration.status, 404);

  const logout = await fetch(`${base}/logout`, { method: "POST", headers });
  assert.equal(logout.status, 200);
  const cookie = logout.headers.get("set-cookie") ?? "";
  assert.match(cookie, /care_admin_session=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Max-Age=0/i);
});

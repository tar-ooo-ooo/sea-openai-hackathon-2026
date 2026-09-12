import assert from "node:assert/strict";
import { test } from "node:test";

test("登入 API 的來源、輸入、cookie 及匿名 session 契約", { skip: process.env.AUTH_HTTP_TEST !== "1" }, async () => {
  const base = "http://localhost:3002/api/user-auth";
  const headers = { Origin: "http://localhost:3000", "Content-Type": "application/json" };
  const session = await fetch(`${base}/session`);
  assert.equal(session.status, 200);
  assert.deepEqual(await session.json(), { user: null });
  assert.equal(session.headers.get("cache-control"), "no-store");
  const preflight = await fetch(`${base}/login`, { method: "OPTIONS", headers });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), headers.Origin);
  assert.equal(preflight.headers.get("access-control-allow-credentials"), "true");
  for (const [options, expected] of [
    [{ headers: { ...headers, Origin: "https://untrusted.invalid" }, body: "{}" }, 403],
    [{ headers: { "Content-Type": "application/json" }, body: "{}" }, 403],
    [{ headers, body: "{}" }, 400],
    [{ headers, body: "invalid-json" }, 400],
    [{ headers, body: "x".repeat(2049) }, 413],
  ]) {
    const response = await fetch(`${base}/login`, { method: "POST", ...options });
    assert.equal(response.status, expected);
    assert.equal(response.headers.get("set-cookie"), null);
  }
  const logout = await fetch(`${base}/logout`, { method: "POST", headers });
  assert.equal(logout.status, 200);
  const cookie = logout.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=lax/i);
  assert.match(cookie, /Max-Age=0/i);
});

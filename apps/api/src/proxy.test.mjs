import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server.js";
import _nextTesting from "next/experimental/testing/server.js";
import { proxy, config } from "./proxy.ts";

const { unstable_doesMiddlewareMatch: _doesProxyMatch } = _nextTesting;

test("集中 CORS：來源、預檢、一般請求及 production allowlist", (t) => {
  const previousEnv = { ...process.env };
  t.after(() => { process.env = previousEnv; });
  process.env.NODE_ENV = "development";
  const request = (origin, method = "GET") => new NextRequest("http://localhost:3002/chat", {
    method, headers: origin ? { Origin: origin } : {},
  });
  for (const origin of ["http://localhost:3000", "http://localhost:3001", "http://localhost:3003"]) {
    for (const method of ["GET", "POST", "OPTIONS"]) {
      const response = proxy(request(origin, method));
      assert.equal(response.status, method === "OPTIONS" ? 204 : 200);
      assert.equal(response.headers.get("access-control-allow-origin"), origin);
      assert.equal(response.headers.get("access-control-allow-credentials"), "true");
      assert.match(response.headers.get("access-control-allow-methods"), /PATCH/);
      assert.match(response.headers.get("access-control-allow-headers"), /Content-Type/);
      assert.equal(response.headers.get("vary"), "Origin");
      assert.equal(response.headers.get("x-middleware-next"), method === "OPTIONS" ? null : "1");
    }
  }
  for (const origin of ["https://untrusted.invalid", "http://localhost:3000.evil.invalid", "null"]) {
    for (const method of ["POST", "OPTIONS"]) {
      const response = proxy(request(origin, method));
      assert.equal(response.status, 403);
      assert.equal(response.headers.get("access-control-allow-origin"), null);
      assert.equal(response.headers.get("x-middleware-next"), null);
    }
  }
  assert.equal(proxy(request(null)).headers.get("x-middleware-next"), "1");
  assert.equal(proxy(request(null, "OPTIONS")).status, 403);
  process.env.NODE_ENV = "production";
  process.env.USER_AUTH_ALLOWED_ORIGINS = "";
  assert.equal(proxy(request("http://localhost:3000")).status, 403);
  process.env.USER_AUTH_ALLOWED_ORIGINS = " https://care.example, https://staff.example ";
  assert.equal(proxy(request("https://care.example")).status, 200);
  assert.equal(proxy(request("https://staff.example")).status, 200);
  assert.equal(proxy(request("http://localhost:3000")).status, 403);
});

test("matcher 涵蓋現有及未來 API，但不處理 Next.js 靜態資源", () => {
  for (const url of ["/chat", "/api/health", "/api/user-auth/login", "/future-endpoint"]) {
    assert.equal(_doesProxyMatch({ config, nextConfig: {}, url }), true);
  }
  for (const url of ["/_next/static/chunk.js", "/_next/image", "/favicon.ico"]) {
    assert.equal(_doesProxyMatch({ config, nextConfig: {}, url }), false);
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";

const { fetchApi } = await import("./fetch-api.ts");

test("fetchApi 使用共用 API URL 並解析 JSON", async (context) => {
  context.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url, "http://localhost:3002/api/health");
    return Response.json({ status: "ok" });
  });

  assert.deepEqual(await fetchApi("/api/health"), { status: "ok" });
});

test("fetchApi 在 API 失敗時拋出狀態碼", async (context) => {
  context.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));

  await assert.rejects(fetchApi("/api/health"), /status 503/);
});

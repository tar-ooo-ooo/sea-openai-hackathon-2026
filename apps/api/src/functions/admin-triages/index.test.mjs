import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest, NextResponse } from "next/server.js";
import { handleAdminTriages } from "./index.ts";

test("分流查詢先驗證專員，拒絕時不可讀取資料", async () => {
  const request = new NextRequest("http://localhost:3002/api/admin/triages");
  for (const status of [401, 403]) {
    const response = await handleAdminTriages(request,
      async () => ({ response: NextResponse.json({ error: "denied" }, { status }) }),
      async () => assert.fail("未授權不得查詢分流"));
    assert.equal(response.status, status);
  }
});

test("分流查詢不快取，保留無個人檔案紀錄，不洩露資料庫錯誤", async () => {
  const request = new NextRequest("http://localhost:3002/api/admin/triages");
  const authenticate = async () => ({ admin: { id: "admin", role: "admin" } });
  const triage = { id: "triage", userId: "user", urgency: "emergency", message: "阿公現在叫不醒", createdAt: "2026-09-12T00:00:00Z", name: null, phone: null, area: null };
  const result = await handleAdminTriages(request, authenticate, async () => [triage]);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.deepEqual(await result.json(), { triages: [triage] });
  const failure = await handleAdminTriages(request, authenticate, async () => { throw new Error("secret database details"); });
  assert.equal(failure.status, 503);
  assert.equal(failure.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(await failure.text(), /secret database/);
});

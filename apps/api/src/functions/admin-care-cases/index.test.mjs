import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server.js";
import * as route from "../../app/api/admin/care-cases/route.ts";
import { handleAdminCareCases } from "./index.ts";

test("聊天需求不得透過舊接案入口建立個案，即使帶有送出狀態", async () => {
  assert.equal("POST" in route, false);
  for (const body of [
    { applicationPackageId: "550e8400-e29b-41d4-a716-446655440000" },
    { applicationPackageId: "550e8400-e29b-41d4-a716-446655440000", status: "SUBMITTED", submittedAt: "2026-09-12T00:00:00Z" },
  ]) {
    const request = new NextRequest("http://localhost:3002/api/admin/care-cases", {
      method: "POST", headers: { Origin: "http://localhost:3001", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const response = await handleAdminCareCases(request);
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET");
    assert.equal(request.bodyUsed, false);
  }
});

test("保留個案查詢入口，未登入仍不可讀取個案", async () => {
  const response = await route.GET(new NextRequest("http://localhost:3002/api/admin/care-cases"));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

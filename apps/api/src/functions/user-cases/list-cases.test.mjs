import assert from "node:assert/strict";
import { test } from "node:test";
import { handleListCases } from "./list-cases.ts";
import { listUserCases } from "../../methods/user-cases/list-cases.ts";

test("案件 API 使用 session 身分、不快取並拒絕 query 冒用", async () => {
  const request = new Request("http://localhost/api/cases", { headers: { Cookie: "care_user_session=test-token" } });
  const getUser = async (token) => { assert.equal(token, "test-token"); return { id: "user-a", role: "user" }; };
  const response = await handleListCases(request, getUser, async (id) => {
    assert.equal(id, "user-a"); return { drafts: [], cases: [] };
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { drafts: [], cases: [] });
  const mustNotList = async () => assert.fail("不得查詢案件");
  assert.equal((await handleListCases(request, async () => null, mustNotList)).status, 401);
  assert.equal((await handleListCases(request, async () => ({ id: "admin", role: "admin" }), mustNotList)).status, 403);
  assert.equal((await handleListCases(new Request("http://localhost/api/cases?userId=user-b", { headers: request.headers }), getUser, mustNotList)).status, 400);
  const failed = await handleListCases(request, getUser, async () => { throw new Error("secret database detail"); });
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /secret database/);
});

test("案件彙整服務、不遺失空案件，草稿不洩露身分證與聯絡資料", async () => {
  const date = new Date("2026-09-12T00:00:00Z");
  const record = { id: "case-a", targetName: "測試對象", summary: "需要協助", caseStatus: "new", createdAt: date, updatedAt: date };
  const service = { id: "service-a", position: 0, category: "喘息服務", name: "喘息服務", reason: "照顧需求", status: "尚未申請" };
  const result = await listUserCases("user-a", async (id) => {
    assert.equal(id, "user-a");
    return {
      drafts: [{ id: "draft-a", data: { recipient: { name: "測試對象", nationalId: "sensitive-id", currentAddress: "sensitive-address" }, applicant: { phone: "sensitive-phone" } }, updatedAt: date }],
      packages: [{ ...record, service }, { ...record, service: { ...service, id: "service-b", position: 1 } }, { ...record, id: "case-empty", service: null }],
    };
  });
  assert.equal(result.cases.length, 2);
  assert.equal(result.cases[0].caseStatus, "new");
  assert.deepEqual(result.cases[0].services.map((item) => item.position), [0, 1]);
  assert.deepEqual(result.cases[1].services, []);
  assert.equal(result.drafts[0].status, "collecting");
  assert.ok(result.drafts[0].missingFields.includes("服務縣市"));
  assert.doesNotMatch(JSON.stringify(result), /sensitive-/);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { handleGetCase } from "./get-case.ts";
import { getUserCase } from "../../methods/user-cases/get-case.ts";

const _id = "00000000-0000-4000-8000-000000000001";
const _user = async () => ({ id: "owner-a", role: "user" });
const _request = new Request(`http://localhost/api/cases/${_id}`);

test("單筆查詢由 session 限定本人，404 不揭露他人資料", async () => {
  const response = await handleGetCase(_request, _id, "case", _user, async (owner, id, kind) => {
    assert.equal(owner, "owner-a"); assert.equal(id, _id); assert.equal(kind, "case");
    return { id };
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { kind: "case", item: { id: _id } });
  assert.equal((await handleGetCase(_request, _id, "case", _user, async () => null)).status, 404);
  const noRead = async () => assert.fail("不可讀取資料");
  assert.equal((await handleGetCase(_request, _id, "case", async () => null, noRead)).status, 401);
  assert.equal((await handleGetCase(_request, "invalid", "draft", _user, noRead)).status, 400);
  assert.equal((await handleGetCase(new Request(`${_request.url}?userId=other`), _id, "case", _user, noRead)).status, 400);
  const failed = await handleGetCase(_request, _id, "case", _user, async () => { throw new Error("private detail"); });
  assert.equal(failed.status, 503); assert.doesNotMatch(await failed.text(), /private detail/);
});

test("單筆 method 傳入 owner 與 ID，案件和草稿不混淆", async () => {
  const read = async (owner, id) => {
    assert.equal(owner, "owner-a"); assert.equal(id, _id);
    return { drafts: [{ id, data: {}, updatedAt: new Date() }], packages: [] };
  };
  assert.equal((await getUserCase("owner-a", _id, "draft", read)).id, _id);
  assert.equal(await getUserCase("owner-a", _id, "case", read), null);
});

test("詳情只輸出照顧描述白名單，案件依本人與連結 ID 取草稿", async () => {
  const raw = { recipient: { nationalId: "private-id", currentAddress: "private-address" }, applicant: { phone: "private-phone" }, careContext: { bathing: "需要協助", goal: "希望有人協助" } };
  const date = new Date();
  const read = async () => ({ drafts: [], packages: [{ id: _id, targetName: "測試", summary: "摘要", caseStatus: "new", createdAt: date, updatedAt: date, service: null }] });
  const result = await getUserCase("owner-a", _id, "case", read, async (owner, id) => {
    assert.equal(owner, "owner-a"); assert.equal(id, _id); return raw;
  });
  assert.equal(result.careOverview[1].items.find((field) => field.label === "洗澡").value, "需要協助");
  assert.equal(result.careOverview[1].items.find((field) => field.label === "走動").value, null);
  assert.doesNotMatch(JSON.stringify(result), /private-/);
  assert.deepEqual((await getUserCase("owner-a", _id, "case", read, async () => undefined)).careOverview, []);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { handleProfile } from "./index.ts";

const _user = async () => ({ id: "owner", role: "user" });
const _input = { name: "測試用戶", birthDate: "1990-01-02", area: "測試地區", phone: "0900000000" };
const _request = (body = _input, origin = "http://localhost:3000") => new Request("http://localhost/api/profile", {
  method: "PUT", headers: { Origin: origin }, body: JSON.stringify(body),
});

test("profile 使用 session owner，未建立回傳 null，手動儲存不接受指定他人", async () => {
  const response = await handleProfile(new Request("http://localhost/api/profile"), _user, async (id) => {
    assert.equal(id, "owner"); return null;
  });
  assert.deepEqual(await response.json(), { profile: null });
  assert.equal(response.headers.get("cache-control"), "no-store");
  const saved = await handleProfile(_request({ ..._input, name: " 測試用戶 " }), _user, undefined, async (id, input) => {
    assert.equal(id, "owner"); assert.deepEqual(input, _input);
    return { ...input, updatedAt: new Date() };
  });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).profile.name, _input.name);
  const noSave = async () => assert.fail("不可寫入");
  for (const patch of [{ userId: "other" }, { name: "" }, { area: " " }, { birthDate: "2025-02-29" }, { birthDate: "2999-01-01" }, { birthDate: "1899-01-01" }, { phone: "------" }, { phone: "abc123" }]) {
    assert.equal((await handleProfile(_request({ ..._input, ...patch }), _user, undefined, noSave)).status, 400);
  }
});

test("profile 拒絕匿名、admin、不可信來源與 query；錯誤不外洩", async () => {
  const noRead = async () => assert.fail("不可讀取");
  assert.equal((await handleProfile(_request(), async () => null, noRead)).status, 401);
  assert.equal((await handleProfile(_request(), async () => ({ id: "admin", role: "admin" }), noRead)).status, 403);
  assert.equal((await handleProfile(_request(_input, "https://evil.example"), _user, noRead)).status, 403);
  assert.equal((await handleProfile(new Request("http://localhost/api/profile", { method: "PUT" }), _user, noRead)).status, 403);
  assert.equal((await handleProfile(new Request("http://localhost/api/profile?userId=other"), _user, noRead)).status, 400);
  const failed = await handleProfile(new Request("http://localhost/api/profile"), _user, async () => { throw new Error("secret-db"); });
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /secret-db/);
});

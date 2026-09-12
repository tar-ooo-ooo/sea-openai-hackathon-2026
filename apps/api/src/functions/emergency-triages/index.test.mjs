import assert from "node:assert/strict";
import { test } from "node:test";
import { handleEmergencyTriage } from "./index.ts";
import { GET } from "../../app/api/openapi/route.ts";

const _user = async () => ({ id: "owner", role: "user" });
const _request = (body, origin = "http://localhost:3000", suffix = "") => new Request(`http://localhost/api/emergency-triages${suffix}`, {
  method: "POST", headers: { Origin: origin, Cookie: "care_user_session=test-token" }, body: JSON.stringify(body),
});
const _never = async () => assert.fail("不應進入分類");

test("端點保留原文，使用 session；回應 no-store", async () => {
  const message = "  我快不行了\n";
  const response = await handleEmergencyTriage(_request({ message }), async (token) => {
    assert.equal(token, "test-token"); return _user();
  }, async (id, text) => {
    assert.equal(id, "owner"); assert.equal(text, message);
    return { urgency: "follow_up", saved: true, triageId: "event" };
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { urgency: "follow_up", saved: true, triageId: "event" });
});

test("拒絕錯誤輸入、越權、缺少來源與 query", async () => {
  for (const input of [null, {}, { message: " " }, { message: 123 }, { message: "x".repeat(4001) }, { message: "test", userId: "other" }, { message: "test", urgency: "normal" }]) {
    assert.equal((await handleEmergencyTriage(_request(input), _user, _never)).status, 400);
  }
  assert.equal((await handleEmergencyTriage(_request({ message: "test" }), async () => null, _never)).status, 401);
  assert.equal((await handleEmergencyTriage(_request({ message: "test" }), async () => ({ id: "admin", role: "admin" }), _never)).status, 403);
  for (const origin of ["", "https://evil.example"]) {
    assert.equal((await handleEmergencyTriage(_request({ message: "test" }, origin), _user, _never)).status, 403);
  }
  assert.equal((await handleEmergencyTriage(_request({ message: "test" }, undefined, "?userId=other"), _user, _never)).status, 400);
  assert.equal((await handleEmergencyTriage(new Request("http://localhost/api/emergency-triages"), _user, _never)).status, 405);
  const invalid = new Request("http://localhost/api/emergency-triages", { method: "POST", headers: { Origin: "http://localhost:3000" }, body: "{" });
  assert.equal((await handleEmergencyTriage(invalid, _user, _never)).status, 400);
});

test("失敗回傳 503、不外洩也不回 normal；OpenAPI 包含端點", async () => {
  const fail = async () => { throw Error("secret-health-db"); };
  for (const [user, evaluate] of [[fail, _never], [_user, fail]]) {
    const response = await handleEmergencyTriage(_request({ message: "test" }), user, evaluate);
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /secret-health-db|normal/);
  }
  const doc = await (await GET()).json();
  assert.ok(doc.paths["/api/emergency-triages"].post.responses["503"]);
});

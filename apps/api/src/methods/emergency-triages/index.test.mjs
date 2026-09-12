import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateEmergencyTriage } from "./index.ts";

test("normal 不寫入；追蹤與危急保留原文並使用 session owner", async () => {
  const message = "  虛構測試訊息\n";
  assert.deepEqual(await evaluateEmergencyTriage("owner", message,
    async () => ({ urgency: "normal" }), async () => assert.fail("不可寫入")),
  { urgency: "normal", saved: false, triageId: null });
  for (const urgency of ["follow_up", "emergency"]) {
    let writes = 0;
    const result = await evaluateEmergencyTriage("owner", message, async (text) => {
      assert.equal(text, message); return { urgency };
    }, async (id, text, grade) => {
      writes++; assert.equal(id, "owner"); assert.equal(text, message); assert.equal(grade, urgency);
      return { id: "event" };
    });
    assert.equal(writes, 1);
    assert.deepEqual(result, { urgency, saved: true, triageId: "event" });
  }
});

test("拒答、非法結果及模型錯誤不寫入、不降級；DB 失敗不上報成功", async () => {
  for (const output of [undefined, {}, { urgency: "urgent" }, { urgency: "normal", extra: true }]) {
    await assert.rejects(evaluateEmergencyTriage("owner", "test", async () => output, async () => assert.fail("不可寫入")));
  }
  await assert.rejects(evaluateEmergencyTriage("owner", "test", async () => { throw Error("timeout"); }, async () => assert.fail("不可寫入")));
  await assert.rejects(evaluateEmergencyTriage("owner", "test", async () => ({ urgency: "emergency" }), async () => { throw Error("database"); }));
});

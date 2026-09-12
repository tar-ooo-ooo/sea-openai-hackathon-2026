import assert from "node:assert/strict";
import { test } from "node:test";
import { caseActionSchema, isAllowedCaseAction } from "./actions.ts";

test("專員操作只接受合法狀態、非空紀錄與白名單欄位", () => {
  const base = { action: "start", summary: "開始聯絡", expectedStatus: "new" };
  assert.ok(caseActionSchema.safeParse(base).success);
  for (const patch of [{ summary: " " }, { summary: "a".repeat(4001) }, { action: "confirm_plan" }, { expectedStatus: "submitted" }, { adminId: "spoof" }]) {
    assert.equal(caseActionSchema.safeParse({ ...base, ...patch }).success, false);
  }
  assert.ok(isAllowedCaseAction(base));
  assert.equal(isAllowedCaseAction({ ...base, expectedStatus: "assessing" }), false);
  for (const action of ["start", "note", "follow_up", "close"]) {
    assert.equal(isAllowedCaseAction({ ...base, action, expectedStatus: "closed" }), false);
  }
  assert.ok(isAllowedCaseAction({ ...base, action: "follow_up", expectedStatus: "assessing" }));
});

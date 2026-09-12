import assert from "node:assert/strict";
import { test } from "node:test";

import { isValidAdminCaseId } from "./validation.ts";

test("案件 ID 僅接受 UUID", () => {
  assert.equal(isValidAdminCaseId("550e8400-e29b-41d4-a716-446655440000"), true);
  for (const caseId of ["", "demo", "550e8400-e29b-61d4-a716-446655440000", "550e8400e29b41d4a716446655440000"]) {
    assert.equal(isValidAdminCaseId(caseId), false);
  }
});

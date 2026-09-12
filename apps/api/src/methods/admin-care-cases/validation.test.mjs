import assert from "node:assert/strict";
import { test } from "node:test";

import { isCreateCaseAssessmentInput, isValidCareCaseId } from "./validation.ts";

const _careCaseId = "550e8400-e29b-41d4-a716-446655440000";

test("正式個案只接受 UUID 案件 ID", () => {
  assert.equal(isValidCareCaseId(_careCaseId), true);
  assert.equal(isValidCareCaseId("demo"), false);
});

test("評估快照只接受有限的 CMS 等級與非空摘要", () => {
  assert.equal(isCreateCaseAssessmentInput({ cmsLevel: 5, summary: "已完成初步評估" }), true);
  assert.equal(isCreateCaseAssessmentInput({ summary: "尚未判定 CMS" }), true);
  assert.equal(isCreateCaseAssessmentInput({ cmsLevel: 5.5, summary: "摘要" }), false);
  assert.equal(isCreateCaseAssessmentInput({ cmsLevel: 100, summary: "摘要" }), false);
  assert.equal(isCreateCaseAssessmentInput({ cmsLevel: 5, summary: "  " }), false);
});

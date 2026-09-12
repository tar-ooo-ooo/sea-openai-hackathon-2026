import assert from "node:assert/strict";
import { test } from "node:test";
import { readCaseData, readCaseDetail } from "./case-data.ts";

const _id = "00000000-0000-4000-8000-000000000001";
const _date = "2026-09-12T01:00:00.000Z";

test("詳情依種類驗證且拒絕錯誤／空資料", () => {
  const item = { id: _id, targetName: "測試", summary: "需求", caseStatus: "new", createdAt: _date, updatedAt: _date, services: [] };
  assert.deepEqual(readCaseDetail({ kind: "case", item }, "case"), { drafts: [], cases: [item] });
  assert.throws(() => readCaseDetail({ kind: "draft", item }, "case"));
  assert.throws(() => readCaseDetail({ kind: "case", item: null }, "case"));
  const careOverview = [{ title: "日常生活協助", items: [{ label: "洗澡", value: null }] }];
  assert.deepEqual(readCaseDetail({ kind: "case", item: { ...item, careOverview } }, "case").cases[0].careOverview, careOverview);
  assert.throws(() => readCaseDetail({ kind: "case", item: { ...item, careOverview: [{ title: "bad", items: [{ label: "洗澡", value: 1 }] }] } }, "case"));
});

test("案件回應保留草稿缺漏、服務狀態與真正空集合", () => {
  assert.deepEqual(readCaseData({ drafts: [], cases: [] }), { drafts: [], cases: [] });
  const input = {
    drafts: [{ id: _id, status: "collecting", targetName: null, jurisdiction: null, summary: null, missingFields: ["服務縣市"], updatedAt: _date }],
    cases: [{ id: _id, targetName: "測試對象", summary: "測試需求", caseStatus: "new", createdAt: _date, updatedAt: _date,
      services: [{ id: _id, position: 0, category: "喘息服務", name: "喘息服務", reason: "照顧需求", status: "尚未申請" }] }],
  };
  assert.deepEqual(readCaseData(input), input);
  assert.throws(() => readCaseData({ ...input, cases: [{ ...input.cases[0], caseStatus: "unknown" }] }));
  assert.throws(() => readCaseData({ ...input, cases: [{ ...input.cases[0], updatedAt: "bad date" }] }));
  assert.throws(() => readCaseData({ ...input, cases: [{ ...input.cases[0], services: [{ ...input.cases[0].services[0], status: "已核准" }] }] }));
});

test("格式錯誤的案件回應不可被當作沒有案件", () => {
  for (const value of [null, {}, { drafts: [] }, { drafts: [], cases: null }, { drafts: [{}], cases: [] }]) {
    assert.throws(() => readCaseData(value));
  }
});

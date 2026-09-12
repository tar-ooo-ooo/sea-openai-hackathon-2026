import assert from "node:assert/strict";
import { test } from "node:test";
import { formatApplicationSections } from "./application-sections.ts";
import { applicationIntakeDataSchema } from "../../types/application-intake.ts";

test("完整明細涵蓋目前表單所有欄位，區分否與未填", () => {
  const sections = formatApplicationSections({
    applicantRole: "FAMILY_PROXY", currentSituation: "HOME",
    applicant: { name: "測試申請人", nationalId: "測試字號" },
    recipient: { currentAddress: "測試地址" },
    careContext: { goal: "測試需求\n第二行" },
    intake: { requestedServices: ["照顧服務", "交通接送"] },
    consent: { privacyAccepted: true, proxyConfirmed: false },
  });
  const fields = sections.flatMap((section) => section.fields);
  const values = fields.map((field) => field.value);
  for (const value of ["家屬代申請", "居家", "測試申請人", "測試字號", "測試地址", "測試需求\n第二行", "照顧服務、交通接送", "是", "否", "尚未提供"]) {
    assert.ok(values.includes(value), value);
  }
  const schemaFields = Object.values(applicationIntakeDataSchema.shape).reduce((count, schema) => {
    const inner = schema.unwrap();
    return count + (inner.shape ? Object.keys(inner.shape).length : 1);
  }, 0);
  assert.equal(fields.length, schemaFields);
});

test("缺漏欄位不捏造資料；不輸出未允許的額外欄位", () => {
  const sections = formatApplicationSections({ extra: "不應公開", applicant: { extra: "不應公開" } });
  assert.ok(sections.flatMap((section) => section.fields).every((field) => field.value === "尚未提供"));
  assert.throws(() => formatApplicationSections({ consent: { privacyAccepted: "false" } }));
});

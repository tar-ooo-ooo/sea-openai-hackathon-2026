import assert from "node:assert/strict";
import { test } from "node:test";
import { getMissingApplicationFields } from "./application-intake-rules.ts";

test("getMissingApplicationFields 只在完整資料時回傳空陣列", () => {
  const missingFields = getMissingApplicationFields({
    jurisdiction: "臺北市",
    applicantRole: "SELF",
    currentSituation: "HOME",
    applicant: { name: "申請人", nationalId: "A123456789", phone: "0912345678" },
    recipient: {
      name: "被照顧者",
      nationalId: "B123456789",
      birthDate: "1950-01-01",
      currentAddress: "臺北市",
    },
    careContext: {
      recentEvent: "近期行動不便",
      mobility: "需要攙扶",
      bathing: "需要協助",
      eating: "可自行進食",
      daytimeCaregiverAvailability: "白天無照顧者",
      primaryCaregiver: "家屬",
      goal: "維持居家生活",
    },
    intake: { requestedServices: ["照顧服務"] },
    consent: { privacyAccepted: true },
  });

  assert.deepEqual(missingFields, []);
});

test("getMissingApplicationFields 拒絕格式錯誤的個資", () => {
  const missingFields = getMissingApplicationFields({
    applicantRole: "SELF",
    applicant: { nationalId: "123", phone: "abc", email: "wrong" },
    recipient: { nationalId: "123", birthDate: "2999-01-01" },
  });

  assert.ok(missingFields.includes("有效的申請人身分證字號或居留證號"));
  assert.ok(missingFields.includes("有效的申請人聯絡電話"));
  assert.ok(missingFields.includes("有效的被照顧者出生日期（YYYY-MM-DD）"));
  assert.ok(missingFields.includes("有效的申請人電子郵件"));
});

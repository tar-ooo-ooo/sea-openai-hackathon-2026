import assert from "node:assert/strict";
import { test } from "node:test";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost/test";

const { db } = await import("../../services/db/client.ts");
const {
  collectApplicationIntake,
  submitApplicationIntake,
  updateApplicationPackage,
} = await import("./collect-application-intake.ts");

const _userId = "00000000-0000-4000-8000-000000000001";
const _intakeId = "00000000-0000-4000-8000-000000000002";
const _completeData = {
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
};

test("收整完成只回傳 ready，不建立禮包", async (context) => {
  let packageCreated = false;
  context.mock.method(db, "update", () => ({
    set: () => ({ where: () => ({ returning: async () => [{}] }) }),
  }));
  context.mock.method(db, "batch", async () => {
    packageCreated = true;
  });

  const result = await collectApplicationIntake(_userId, _intakeId, _completeData, {});

  assert.deepEqual(result, { status: "ready", missingFields: [] });
  assert.equal(packageCreated, false);
});

test("使用者送出前重新驗證並合併 DB 內的完整資料", async (context) => {
  let packageCreated = false;
  context.mock.method(db, "select", () => ({
    from: () => ({
      where: () => ({
        limit: async () => [{ data: _completeData, status: "collecting", applicationPackageId: null }],
      }),
    }),
  }));
  context.mock.method(db, "batch", async (queries) => {
    packageCreated = true;
    assert.match(JSON.stringify(queries[2].toSQL().params), /繼續在家生活/);
  });

  const result = await submitApplicationIntake(_userId, _intakeId, {
    careContext: { goal: "繼續在家生活" },
  });

  assert.equal(result.status, "packaged");
  assert.match(result.applicationPackageId ?? "", /^[0-9a-f-]{36}$/);
  assert.equal(packageCreated, true);
});

test("重複送出同一 intake 只回傳既有正式案件", async (context) => {
  context.mock.method(db, "select", () => ({
    from: () => ({
      where: () => ({
        limit: async () => [{
          data: _completeData,
          status: "packaged",
          applicationPackageId: "00000000-0000-4000-8000-000000000003",
        }],
      }),
    }),
  }));
  context.mock.method(db, "batch", async () => assert.fail("不得重複建立案件"));

  assert.deepEqual(await submitApplicationIntake(_userId, _intakeId, _completeData), {
    status: "packaged",
    missingFields: [],
    applicationPackageId: "00000000-0000-4000-8000-000000000003",
  });
});

test("更新禮包前以 userId 重新讀取並合併資料", async (context) => {
  let packageUpdated = false;
  let selectCount = 0;
  context.mock.method(db, "select", () => ({
    from: () => ({
      where: () =>
        ++selectCount === 1
          ? {
              limit: async () => [
                {
                  data: _completeData,
                  applicationPackageId: "00000000-0000-4000-8000-000000000003",
                },
              ],
            }
          : Promise.resolve([{ name: "喘息服務", status: "已送出" }]),
    }),
  }));
  context.mock.method(db, "batch", async (queries) => {
    packageUpdated = true;
    assert.equal(queries[3].toSQL().params.includes("已送出"), true);
  });

  const result = await updateApplicationPackage(_userId, _intakeId, {
    intake: { requestedServices: ["喘息服務"] },
  });

  assert.deepEqual(result, {
    status: "packaged",
    missingFields: [],
    applicationPackageId: "00000000-0000-4000-8000-000000000003",
  });
  assert.equal(packageUpdated, true);
  assert.equal(selectCount, 2);
});

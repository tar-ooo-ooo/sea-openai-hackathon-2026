import assert from "node:assert/strict";
import { test } from "node:test";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost/test";

const {
  handleGetApplicationIntake,
  handleSubmitApplicationIntake,
} = await import("./index.ts");

const _id = "00000000-0000-4000-8000-000000000001";
const _user = async () => ({ id: "owner-a", role: "user" });
const _completeData = {
  jurisdiction: "臺北市",
  applicantRole: "SELF",
  currentSituation: "HOME",
  applicant: { name: "申請人", nationalId: "A123456789", phone: "0912345678" },
  recipient: {
    name: "需服務者",
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

test("讀取 Agent 收整資料時以 session 限定本人", async () => {
  const request = new Request(`http://localhost/api/application-intakes/${_id}`, {
    headers: { Cookie: "care_user_session=test-token" },
  });
  const response = await handleGetApplicationIntake(request, _id, _user, async (owner, id) => {
    assert.equal(owner, "owner-a");
    assert.equal(id, _id);
    return { id, data: _completeData };
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { intake: { id: _id, data: _completeData } });
});

test("確認送出後建立正式案件，缺漏資料不建立", async () => {
  const request = (body) => new Request(`http://localhost/api/application-intakes/${_id}`, {
    method: "POST",
    headers: { Cookie: "care_user_session=test-token", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const response = await handleSubmitApplicationIntake(
    request({
      confirmed: true,
      data: {
        ..._completeData,
        application: { status: "DRAFT" },
        consent: { privacyAccepted: true, finalSubmissionApproved: true },
      },
    }),
    _id,
    _user,
    async (owner, id, data) => {
      assert.equal(owner, "owner-a");
      assert.equal(id, _id);
      assert.deepEqual(data, _completeData);
      return { status: "packaged", missingFields: [], applicationPackageId: "package-a" };
    },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { applicationPackageId: "package-a" });

  const incomplete = await handleSubmitApplicationIntake(
    request({ confirmed: true, data: _completeData }),
    _id,
    _user,
    async () => ({ status: "collecting", missingFields: ["服務縣市"] }),
  );
  assert.equal(incomplete.status, 422);
  assert.deepEqual((await incomplete.json()).missingFields, ["服務縣市"]);
});

test("送出 API 拒絕未登入、未確認與無效 JSON", async () => {
  const noSubmit = async () => assert.fail("不得送出");
  const base = `http://localhost/api/application-intakes/${_id}`;
  assert.equal((await handleSubmitApplicationIntake(
    new Request(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
    _id,
    async () => null,
    noSubmit,
  )).status, 401);
  assert.equal((await handleSubmitApplicationIntake(
    new Request(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmed: false, data: {} }) }),
    _id,
    _user,
    noSubmit,
  )).status, 400);
  assert.equal((await handleSubmitApplicationIntake(
    new Request(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }),
    _id,
    _user,
    noSubmit,
  )).status, 400);
});

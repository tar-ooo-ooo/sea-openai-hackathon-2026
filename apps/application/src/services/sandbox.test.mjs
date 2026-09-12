import assert from "node:assert/strict";
import { test } from "node:test";

import { createSandboxService } from "./sandbox.ts";
import { createMemoryStorage } from "./storage.ts";

test("application 草稿可保存並由新 service instance 讀回", () => {
  const storage = createMemoryStorage();
  const service = createSandboxService(storage);
  const application = service.createCase();

  service.updateCase(application.id, {
    jurisdiction: "臺北市",
    intake: { requestedServices: ["喘息服務"] },
  });

  const saved = createSandboxService(storage).getCase(application.id);
  assert.equal(saved.jurisdiction, "臺北市");
  assert.deepEqual(saved.intake?.requestedServices, ["喘息服務"]);
});

test("可用 Agent intake ID 與資料建立申請草稿", () => {
  const service = createSandboxService(createMemoryStorage());
  const application = service.createCase("00000000-0000-4000-8000-000000000001", {
    jurisdiction: "臺北市",
    recipient: { name: "測試對象" },
    consent: { privacyAccepted: true },
  });

  assert.equal(application.id, "00000000-0000-4000-8000-000000000001");
  assert.equal(application.jurisdiction, "臺北市");
  assert.equal(application.recipient.name, "測試對象");
  assert.equal(application.consent.privacyAccepted, true);
  assert.equal(service.createCase(application.id).id, application.id);
  assert.equal(service.listCases().length, 1);
});

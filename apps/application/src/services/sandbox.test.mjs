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

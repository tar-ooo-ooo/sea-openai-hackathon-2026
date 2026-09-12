import assert from "node:assert/strict";
import { test } from "node:test";
import { Runner } from "@openai/agents";

import { runChatAgent } from "./chat-agent.ts";

test("申請 Agent 提供收整與產生禮包兩個 tools", async (context) => {
  let toolNames = [];
  context.mock.method(Runner.prototype, "run", async (agent) => {
    toolNames = agent.tools.map((item) => item.name);
    return { finalOutput: "完成" };
  });

  await runChatAgent("我要申請長照", {
    status: "collecting",
    data: {},
    missingFields: [],
    optionalFields: [],
    collect: async () => ({ status: "ready", missingFields: [] }),
    generate: async () => ({
      status: "packaged",
      missingFields: [],
      applicationPackageId: "00000000-0000-4000-8000-000000000001",
    }),
    update: async () => ({
      status: "packaged",
      missingFields: [],
      applicationPackageId: "00000000-0000-4000-8000-000000000001",
    }),
  });

  assert.deepEqual(toolNames, [
    "collect_application_intake",
    "generate_application_package",
  ]);
});

test("修改既有禮包時只提供更新 tool", async (context) => {
  let toolNames = [];
  context.mock.method(Runner.prototype, "run", async (agent) => {
    toolNames = agent.tools.map((item) => item.name);
    return { finalOutput: "已更新" };
  });

  await runChatAgent("把照顧服務改成喘息服務", {
    status: "packaged",
    data: { intake: { requestedServices: ["照顧服務"] } },
    missingFields: [],
    optionalFields: [],
    collect: async () => ({ status: "ready", missingFields: [] }),
    generate: async () => ({ status: "packaged", missingFields: [] }),
    update: async () => ({
      status: "packaged",
      missingFields: [],
      applicationPackageId: "00000000-0000-4000-8000-000000000001",
    }),
  });

  assert.deepEqual(toolNames, ["update_application_package"]);
});

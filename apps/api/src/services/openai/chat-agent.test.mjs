import assert from "node:assert/strict";
import { test } from "node:test";
import { Runner } from "@openai/agents";

import { runChatAgent, summarizeChatHistory } from "./chat-agent.ts";

test("Chat Agent 同時取得摘要與近期訊息", async (context) => {
  let input = "";
  let instructions = "";
  context.mock.method(Runner.prototype, "run", async (agent, nextInput) => {
    instructions = agent.instructions;
    input = nextInput;
    return { finalOutput: "完成" };
  });

  await runChatAgent(
    "最新問題",
    undefined,
    [{ role: "user", content: "近期訊息" }],
    "較舊對話摘要",
  );

  assert.match(input, /對話摘要：\n較舊對話摘要/);
  assert.match(input, /對話前文：\n使用者：近期訊息/);
  assert.match(instructions, /長期照顧服務法：https:\/\/1966\.gov\.tw/);
  assert.match(instructions, /只有使用者明確詢問資料來源時/);
});

test("摘要 Agent 合併既有摘要與較舊訊息", async (context) => {
  let input = "";
  context.mock.method(Runner.prototype, "run", async (_agent, nextInput) => {
    input = nextInput;
    return { finalOutput: "合併後摘要" };
  });

  const summary = await summarizeChatHistory("既有摘要", [
    { role: "assistant", content: "較舊回覆" },
  ]);

  assert.equal(summary, "合併後摘要");
  assert.match(input, /既有摘要：\n既有摘要/);
  assert.match(input, /較舊對話：\n助手：較舊回覆/);
});

test("申請 Agent 提供收整與產生禮包兩個 tools", async (context) => {
  let toolNames = [];
  let instructions = "";
  context.mock.method(Runner.prototype, "run", async (agent) => {
    toolNames = agent.tools.map((item) => item.name);
    instructions = agent.instructions;
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
  assert.match(instructions, /申請長照服務：https:\/\/1966\.gov\.tw/);
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

import assert from "node:assert/strict";
import { test } from "node:test";
import { Runner } from "@openai/agents";

import {
  reviewApplicationForm,
  runChatAgent,
  summarizeChatHistory,
} from "./chat-agent.ts";

test("Chat Agent 同時取得摘要與近期訊息", async (context) => {
  let input = "";
  let instructions = "";
  context.mock.method(Runner.prototype, "run", async (agent, nextInput) => {
    instructions = agent.instructions;
    input = nextInput;
    return { finalOutput: "已記錄您是**家屬代理**申請。\n- 在家中" };
  });

  const reply = await runChatAgent(
    "最新問題",
    undefined,
    [{ role: "user", content: "近期訊息" }],
    "較舊對話摘要",
  );

  assert.match(input, /對話摘要：\n較舊對話摘要/);
  assert.match(input, /對話前文：\n使用者：近期訊息/);
  assert.equal(reply, "已記錄您是**家屬代理**申請。\n- 在家中");
  assert.match(instructions, /回覆使用繁體中文 Markdown/);
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

test("申請 Agent 只收整資料，不提早建立正式案件", async (context) => {
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
    prepare: async () => ({
      status: "ready",
      missingFields: [],
      formReview: { prefillFields: ["jurisdiction"] },
    }),
    update: async () => ({
      status: "packaged",
      missingFields: [],
      applicationPackageId: "00000000-0000-4000-8000-000000000001",
    }),
  });

  assert.deepEqual(toolNames, ["collect_application_intake", "prepare_application_form"]);
  assert.match(instructions, /資料已收整完成，請在自動操作視窗確認並送出申請/);
  assert.doesNotMatch(instructions, /告知 Sol|交由 Sol/);
  assert.doesNotMatch(instructions, /http:\/\/localhost:3003\/apply/);
  assert.match(instructions, /不得提供申請連結/);
  assert.match(instructions, /正式案件只能在使用者檢視並確認表單後建立/);
  assert.match(instructions, /回答「本人」時，必須設定 applicantRole 為 SELF/);
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
    prepare: async () => ({ status: "ready", missingFields: [] }),
    update: async () => ({
      status: "packaged",
      missingFields: [],
      applicationPackageId: "00000000-0000-4000-8000-000000000001",
    }),
  });

  assert.deepEqual(toolNames, ["update_application_package"]);
});

test("Sol 使用結構化輸出分析可預填欄位", async (context) => {
  let model = "";
  let reasoning;
  let input = "";
  context.mock.method(Runner.prototype, "run", async (agent, nextInput) => {
    model = agent.model;
    reasoning = agent.modelSettings.reasoning;
    input = nextInput;
    return { finalOutput: { prefillFields: ["jurisdiction", "recipient.name"] } };
  });

  const result = await reviewApplicationForm(
    { jurisdiction: "臺北市", recipient: { name: "測試使用者" } },
    ["jurisdiction", "recipient.name"],
  );

  assert.equal(model, "gpt-5.6-sol");
  assert.deepEqual(reasoning, { effort: "medium" });
  assert.match(input, /availableFields/);
  assert.deepEqual(result, { prefillFields: ["jurisdiction", "recipient.name"] });
});

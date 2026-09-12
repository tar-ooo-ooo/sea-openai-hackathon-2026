import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const _openAiApiKey = process.env.OPENAI_API_KEY;

before(() => {
  delete process.env.OPENAI_API_KEY;
});

after(() => {
  if (_openAiApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = _openAiApiKey;
});

const { handleChat } = await import("./handle-chat.ts");

test("handleChat 拒絕不合法的訊息", async () => {
  const response = await handleChat(new Request("http://localhost/chat", {
    method: "POST",
    body: JSON.stringify({ message: " " }),
  }));

  assert.equal(response.status, 400);
});

test("handleChat 未設定 API key 時不呼叫 Agent", async () => {
  const response = await handleChat(new Request("http://localhost/chat", {
    method: "POST",
    body: JSON.stringify({ message: "你好" }),
  }));

  assert.equal(response.status, 503);
});

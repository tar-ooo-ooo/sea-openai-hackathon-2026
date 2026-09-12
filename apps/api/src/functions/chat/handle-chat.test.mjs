import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const _openAiApiKey = process.env.OPENAI_API_KEY;
const _databaseUrl = process.env.DATABASE_URL;

before(() => {
  delete process.env.OPENAI_API_KEY;
});

after(() => {
  if (_openAiApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = _openAiApiKey;
  if (_databaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = _databaseUrl;
});

process.env.DATABASE_URL ??= "postgresql://test:test@localhost/test";
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

test("handleChat 以 NDJSON 回傳進度與結果", async () => {
  process.env.OPENAI_API_KEY = "test-key";

  try {
    const response = await handleChat(new Request("http://localhost/chat", {
      method: "POST",
      headers: { Accept: "application/x-ndjson" },
      body: JSON.stringify({ message: "你好" }),
    }), async (message, onProgress) => {
      assert.equal(message, "你好");
      onProgress?.({ id: "analysis", label: "正在整理回覆", status: "active" });
      return "OK";
    });
    const events = (await response.text()).trim().split("\n").map(JSON.parse);

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^application\/x-ndjson/);
    assert.deepEqual(events, [
      {
        type: "progress",
        progress: { id: "analysis", label: "正在整理回覆", status: "active" },
      },
      { type: "result", result: { reply: "OK" } },
    ]);
  } finally {
    delete process.env.OPENAI_API_KEY;
  }
});

test("handleChat 拒絕不合法的 userId", async () => {
  const response = await handleChat(new Request("http://localhost/chat", {
    method: "POST",
    body: JSON.stringify({ message: "我要申請長照", userId: "not-a-uuid" }),
  }));

  assert.equal(response.status, 400);
});

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
const _user = { id: "00000000-0000-4000-8000-000000000001", role: "user" };
const _getUser = async () => _user;

test("handleChat 拒絕不合法的訊息", async () => {
  const response = await handleChat(new Request("http://localhost/chat", {
    method: "POST",
    body: JSON.stringify({ message: " " }),
  }), undefined, _getUser);

  assert.equal(response.status, 400);
});

test("handleChat 未設定 API key 時不呼叫 Agent", async () => {
  const response = await handleChat(new Request("http://localhost/chat", {
    method: "POST",
    body: JSON.stringify({ message: "你好" }),
  }), undefined, _getUser);

  assert.equal(response.status, 503);
});

test("handleChat 以 NDJSON 回傳進度與結果", async () => {
  process.env.OPENAI_API_KEY = "test-key";

  try {
    const response = await handleChat(new Request("http://localhost/chat", {
      method: "POST",
      headers: { Accept: "application/x-ndjson" },
      body: JSON.stringify({ message: "你好" }),
    }), async (message, onProgress, userId) => {
      assert.equal(message, "你好");
      assert.equal(userId, _user.id);
      onProgress?.({ id: "analysis", label: "正在整理回覆", status: "active" });
      return "OK";
    }, _getUser);
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
  }), undefined, _getUser);

  assert.equal(response.status, 400);
});

test("聊天拒絕匿名與冒用 userId，驗證失敗不呼叫 Agent", async () => {
  const request = (userId) => new Request("http://localhost/chat", { method: "POST", body: JSON.stringify({ message: "你好", userId }) });
  const send = async () => { assert.fail("不應呼叫 Agent"); };
  assert.equal((await handleChat(request(), send)).status, 401);
  assert.equal((await handleChat(request("00000000-0000-4000-8000-000000000002"), send, _getUser)).status, 403);
  assert.equal((await handleChat(request(), send, async () => { throw new Error("private detail"); })).status, 503);
});

test("session cookie 解析不消耗原始 POST body", async () => {
  const { getChatUser } = await import("./chat-session.ts");
  const request = new Request("http://localhost/chat", { method: "POST", body: '{"message":"你好"}' });
  assert.equal(await getChatUser(request), null);
  assert.deepEqual(await request.json(), { message: "你好" });
  // Next.js adapter 的 Request 不一定與匯入模組使用相同 constructor。
  assert.equal(await getChatUser({ url: request.url, headers: request.headers }), null);
});

test("歷史查詢只使用 session 身分並且不快取", async () => {
  const { handleHistory } = await import("./handle-history.ts");
  const request = new Request("http://localhost/api/chat/history?userId=another-user");
  const response = await handleHistory(request, _getUser, async (userId) => {
    assert.equal(userId, _user.id);
    return [{ role: "assistant", content: "您好" }];
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { messages: [{ role: "assistant", content: "您好" }] });
  assert.equal((await handleHistory(request, async () => null, async () => { assert.fail(); })).status, 401);
  const failed = await handleHistory(request, _getUser, async () => { throw new Error("private detail"); });
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /private detail/);
});

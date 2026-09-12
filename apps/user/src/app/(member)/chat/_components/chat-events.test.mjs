import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeAssistantContent, readChatStream, readHistory, shouldSendOnEnter } from "./chat-events.ts";

test("舊版收整完成訊息不顯示內部模型名稱或裸露 Markdown", () => {
  const legacy = "**已收整完成。**Sol 已完成表單欄位分析，請先檢視資料。";
  assert.equal(normalizeAssistantContent(legacy), "資料已收整完成。請先檢視資料。");
  assert.equal(normalizeAssistantContent("**資料已收整完成。**請使用申請入口。"), "資料已收整完成。請使用申請入口。");
  assert.equal(readHistory({ messages: [{ role: "assistant", content: legacy }] })[0].content, "資料已收整完成。請先檢視資料。");
});

test("申請動作在串流與歷史保留，使用者訊息和無效動作不產生入口", async () => {
  const action = { type: "application_computer", intakeId: "00000000-0000-4000-8000-000000000001" };
  const events = [];
  await readChatStream(new Response(JSON.stringify({ type: "result", result: { reply: "請查看", action } })).body, (event) => events.push(event));
  assert.deepEqual(events[0].result.action, action);
  assert.deepEqual(readHistory({ messages: [{ role: "assistant", content: "請查看", action }] })[0].action, action);
  assert.equal(readHistory({ messages: [{ role: "user", content: "請查看", action }] })[0].action, undefined);
  for (const invalid of [null, { ...action, intakeId: "../other" }, { ...action, type: "submit" }, { type: "application_computer" }]) {
    assert.deepEqual(readHistory({ messages: [{ role: "assistant", content: "文字仍在", action: invalid }] }), [{ role: "assistant", content: "文字仍在" }]);
    const received = [];
    await readChatStream(new Response(JSON.stringify({ type: "result", result: { reply: "文字仍在", action: invalid } })).body, (event) => received.push(event));
    assert.deepEqual(received[0].result, { reply: "文字仍在" });
  }
});

test("只有後端核准的 action 會產生 Computer Tool 入口", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const content = `資料已收整完成。[檢視並送出申請](http://localhost:3003/apply/${id})`;
  const history = readHistory({ messages: [{ role: "assistant", content }] })[0];
  assert.equal(history.action, undefined);
  assert.match(history.content, /\[我的案件\]\(\/cases\)/);
  assert.doesNotMatch(history.content, /localhost:3003/);
  assert.doesNotMatch(history.content, /正式案件會/);
  const events = [];
  await readChatStream(new Response(JSON.stringify({ type: "result", result: { reply: content } })).body, (event) => events.push(event));
  assert.equal(events[0].result.action, undefined);
  assert.doesNotMatch(events[0].result.reply, /localhost:3003/);
});

test("Enter 送出，但換行與中文輸入法選字不誤送", () => {
  const event = { key: "Enter", shiftKey: false, metaKey: false, isComposing: false, keyCode: 13 };
  assert.equal(shouldSendOnEnter(event), true);
  for (const patch of [{ shiftKey: true }, { metaKey: true }, { isComposing: true }, { keyCode: 229 }, { key: "a" }]) {
    assert.equal(shouldSendOnEnter({ ...event, ...patch }), false);
  }
});

test("NDJSON 可處理中文字跨 chunk、進度與無結尾換行", async () => {
  const text = JSON.stringify({ type: "progress", progress: { id: "a", label: "整理中", status: "active" } }) + "\n"
    + JSON.stringify({ type: "result", result: { reply: "您好" } });
  const stream = new ReadableStream({ start(controller) {
    for (const byte of new TextEncoder().encode(text)) controller.enqueue(new Uint8Array([byte]));
    controller.close();
  } });
  const events = [];
  await readChatStream(stream, (event) => events.push(event));
  assert.equal(events[0].progress.label, "整理中");
  assert.equal(events[1].result.reply, "您好");
});

test("NDJSON 中斷、錯誤及不合法事件不可假裝成功", async () => {
  for (const text of ["", "{}\n", '{"type":"error","error":"private"}\n', '{"type":"result","result":{"reply":123}}', "invalid"]) {
    await assert.rejects(readChatStream(new Response(text).body, () => {}));
  }
  assert.deepEqual(readHistory({ messages: [{ role: "user", content: "你好" }] }), [{ role: "user", content: "你好" }]);
  assert.throws(() => readHistory({ messages: [{ role: "admin", content: "你好" }] }));
  assert.throws(() => readHistory({}));
});

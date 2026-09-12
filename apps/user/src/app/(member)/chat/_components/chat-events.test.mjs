import assert from "node:assert/strict";
import { test } from "node:test";
import { readChatStream, readHistory } from "./chat-events.ts";

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

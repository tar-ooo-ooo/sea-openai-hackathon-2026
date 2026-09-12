import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeAssistantContent, readChatStream, readHistory, validateTriageResult, shouldSendOnEnter } from "./chat-events.ts";
import { readFileSync } from "node:fs";

test("危急分流結果須符合分級及寫入狀態契約", () => {
  validateTriageResult({ urgency: "normal", saved: false, triageId: null });
  for (const urgency of ["follow_up", "emergency"]) {
    validateTriageResult({ urgency, saved: true, triageId: "00000000-0000-4000-8000-000000000001" });
  }
  for (const value of [null, {}, { urgency: "normal", saved: true, triageId: null },
    { urgency: "emergency", saved: false, triageId: null }, { urgency: "follow_up", saved: true, triageId: "bad" }]) {
    assert.throws(() => validateTriageResult(value));
  }
});

test("聊天送出並行分流，不等待分類且失敗獨立處理", () => {
  const source = readFileSync(new URL("./ChatPanel.tsx", import.meta.url), "utf8");
  assert.match(source, /void fetchApi<unknown>\("\/api\/emergency-triages"/);
  assert.doesNotMatch(source, /await fetchApi[^\n]*emergency-triages/);
  const check = source.slice(source.indexOf('void fetchApi<unknown>("/api/emergency-triages"'), source.indexOf("const timeout ="));
  assert.match(check, /credentials: "include"/);
  assert.match(check, /AbortSignal.timeout\(35_000\)/);
  assert.match(check, /then\(validateTriageResult\).catch/);
  assert.match(check, /setTriageFailed\(true\)/);
  assert.doesNotMatch(check, /setSending|setNeedsReload|controller.abort|await/);
});

test("舊版收整完成訊息不顯示內部模型名稱或裸露 Markdown", () => {
  const legacy = "**已收整完成。**Sol 已完成表單欄位分析，請先檢視資料。";
  assert.equal(normalizeAssistantContent(legacy), "資料已收整完成。請先檢視資料。");
  assert.equal(normalizeAssistantContent("**資料已收整完成。**請使用申請入口。"), "資料已收整完成。請使用申請入口。");
  assert.equal(readHistory({ messages: [{ role: "assistant", content: legacy }] })[0].content, "資料已收整完成。請先檢視資料。");
});

test("申請動作在串流與歷史保留，使用者訊息和無效動作不產生入口", async () => {
  const action = { type: "application_review", caseId: "00000000-0000-4000-8000-000000000001" };
  const events = [];
  await readChatStream(new Response(JSON.stringify({ type: "result", result: { reply: "請查看", action } })).body, (event) => events.push(event));
  assert.deepEqual(events[0].result.action, action);
  assert.deepEqual(readHistory({ messages: [{ role: "assistant", content: "請查看", action }] })[0].action, action);
  assert.equal(readHistory({ messages: [{ role: "user", content: "請查看", action }] })[0].action, undefined);
  for (const invalid of [null, { ...action, caseId: "../other" }, { ...action, type: "submit" }, { type: "application_review" }]) {
    assert.deepEqual(readHistory({ messages: [{ role: "assistant", content: "文字仍在", action: invalid }] }), [{ role: "assistant", content: "文字仍在" }]);
    const received = [];
    await readChatStream(new Response(JSON.stringify({ type: "result", result: { reply: "文字仍在", action: invalid } })).body, (event) => received.push(event));
    assert.deepEqual(received[0].result, { reply: "文字仍在" });
  }
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

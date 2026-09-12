"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import { fetchApi } from "@/lib/fetch-api";
import { readChatStream, readHistory, shouldSendOnEnter, type ChatMessage, type ChatProgress } from "./chat-events";
import styles from "./chat-panel.module.css";

const _suggestedPrompts = ["我想申請長照服務", "家人生活起居需要協助", "幫我整理長照申請流程"];

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<ChatProgress[]>([]);
  const [reload, setReload] = useState(0);
  const [needsReload, setNeedsReload] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const sendLock = useRef(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    activeRequest.current = controller;
    fetchApi<unknown>("/api/chat/history", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(readHistory)
      .then((history) => { if (!controller.signal.aborted) { setMessages(history); setNeedsReload(false); } })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setNeedsReload(true);
          setError(cause instanceof Error && cause.message.includes("status 401")
            ? "登入已過期，請重新登入。" : "暫時無法載入聊天紀錄，請重試。這不代表紀錄已被刪除。");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); activeRequest.current?.abort(); };
  }, [reload]);

  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [messages, progress]);

  async function send(value = draft) {
    const message = value.trim();
    if (!message || message.length > 4000 || sendLock.current || loading || needsReload) return;
    sendLock.current = true;
    const controller = new AbortController();
    activeRequest.current = controller;
    setSending(true);
    setError("");
    setProgress([]);
    setDraft("");
    setMessages((current) => [...current, { role: "user", content: message }]);
    // 不自動重送：後端可能已保存訊息或建立申請。
    const timeout = setTimeout(() => controller.abort(), 120_000);
    try {
      const stream = await fetchApi("/chat", {
        method: "POST", credentials: "include", signal: controller.signal,
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({ message }),
      }, "stream");
      await readChatStream(stream, (update) => {
        if (controller.signal.aborted) return;
        if (update.type === "result") setMessages((current) => [...current, { role: "assistant", content: update.result.reply }]);
        else setProgress((current) => [...current.filter((item) => item.id !== update.progress.id), update.progress]);
      });
    } catch (cause) {
      setNeedsReload(true);
      setDraft(message);
      setError(cause instanceof Error && cause.message.includes("status 401")
        ? "登入已過期，請重新登入。"
        : "未能完整取得回覆。訊息可能已保存，請先重新載入紀錄確認，再決定是否重送。");
    } finally {
      clearTimeout(timeout);
      sendLock.current = false;
      setSending(false);
      setProgress([]);
    }
  }

  return <section className={styles.panel} aria-label="與智慧小幫手對話">
    <header className={styles.heading}>
      <span className={styles.headerIcon} aria-hidden="true">✦</span>
      <div><h1>智慧小幫手</h1><p>隨時協助你釐清問題與安排下一步。</p></div>
    </header>
    <div className={styles.messages} role="log" aria-label="聊天紀錄" aria-live="polite" aria-busy={loading}>
      <div className={styles.conversation}>
      {loading ? <p className="muted">正在載入聊天紀錄…</p> : messages.length === 0 && !needsReload ? <article className={styles.assistant} aria-label="智慧小幫手"><span className={styles.avatar} aria-hidden="true">✦</span><p className={styles.bubble}>你好！我是長照智慧小幫手。可以先說說目前遇到的照顧困難，我會協助你整理申請服務的下一步。</p></article> : null}
      {messages.map((message, index) => <article key={index} className={message.role === "user" ? styles.user : styles.assistant} aria-label={message.role === "user" ? "你" : "智慧小幫手"}>{message.role === "assistant" && <span className={styles.avatar} aria-hidden="true">✦</span>}{message.role === "assistant" ? <div className={styles.bubble}><Markdown>{message.content}</Markdown></div> : <p className={styles.bubble}>{message.content}</p>}</article>)}
      {sending && <div role="status" className={styles.assistant} aria-label="AI 正在整理回覆"><span className={styles.avatar} aria-hidden="true">✦</span><div className={styles.processing}><p>智慧小幫手正在協助你</p>{progress.length ? <ul>{progress.map((item) => <li key={item.id}><span aria-hidden="true">{item.status === "complete" ? "✓" : "◌"}</span>{item.label}</li>)}</ul> : <span>正在連線並準備資料…</span>}</div></div>}
      <div ref={end} />
      </div>
    </div>
    <div className={styles.composer}>
    {error && <div className="error-message" role="alert">{error} <Link href="/login" className="quiet-link">前往登入</Link></div>}
    {needsReload && <button className="button secondary" disabled={sending || loading} onClick={() => { setLoading(true); setError(""); setReload((value) => value + 1); }}>重新載入紀錄</button>}
    <p className={styles.promptLabel}>你可以這樣問</p>
    <div className={styles.suggestions}>{_suggestedPrompts.map((prompt) => <button type="button" key={prompt} disabled={loading || sending || needsReload} onClick={() => void send(prompt)}>{prompt}</button>)}</div>
    <form onSubmit={(event) => { event.preventDefault(); void send(); }} className={styles.inputRow}>
      <label htmlFor="chat-message" className={styles.srOnly}>輸入訊息</label>
      <textarea id="chat-message" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
        if (!shouldSendOnEnter(event.nativeEvent)) return;
        event.preventDefault();
        void send();
      }} maxLength={4000} rows={1} disabled={loading || sending || needsReload} placeholder="輸入你的問題..." aria-describedby="chat-hint chat-privacy" />
      <button className={styles.sendButton} aria-label={sending ? "處理中" : "送出訊息"} disabled={loading || sending || needsReload || !draft.trim()}>{sending ? <span aria-hidden="true">◌</span> : <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z M22 2 11 13" /></svg>}</button>
    </form>
    <p id="chat-hint" className={styles.hint}>Enter 送出 · Shift／⌘ + Enter 換行 <span>{draft.length} / 4000 字</span></p>
    <p id="chat-privacy" className={styles.notice}>比賽測試版，請只使用虛構資料，勿輸入真實個資。申請整理不代表已送出申請。歷史顯示最近 20 則。</p>
    </div>
  </section>;
}

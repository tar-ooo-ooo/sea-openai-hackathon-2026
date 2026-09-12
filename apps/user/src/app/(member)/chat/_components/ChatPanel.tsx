"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/fetch-api";
import { readChatStream, readHistory, type ChatMessage, type ChatProgress } from "./chat-events";
import styles from "./chat-panel.module.css";

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

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
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
    <p className={styles.notice}>比賽測試版：請使用虛構資料，不要輸入真實身分證、電話、地址或健康個資。申請整理不代表已送出申請。</p>
    <div className={styles.messages} role="log" aria-label="聊天紀錄" aria-live="polite" aria-busy={loading}>
      {loading ? <p className="muted">正在載入聊天紀錄…</p> : messages.length === 0 && !needsReload ? <div className={styles.empty}><span className="brand-mark" aria-hidden="true">伴</span><h2>你好，我是你的智慧小幫手</h2><p>可以先說說目前遇到的照顧困難，我們一起整理下一步。</p></div> : null}
      {messages.map((message, index) => <article key={index} className={message.role === "user" ? styles.user : styles.assistant}><span className={styles.speaker}>{message.role === "user" ? "你" : "智慧小幫手"}</span><p>{message.content}</p></article>)}
      <div ref={end} />
    </div>
    <div role="status" className={styles.progress}>{sending && (progress.length ? progress.map((item) => <span key={item.id}>{item.status === "complete" ? "✓" : "◌"} {item.label}</span>) : "正在連線…")}</div>
    {error && <div className="error-message" role="alert">{error} <Link href="/login" className="quiet-link">前往登入</Link></div>}
    {needsReload && <button className="button secondary" disabled={sending || loading} onClick={() => { setLoading(true); setError(""); setReload((value) => value + 1); }}>重新載入紀錄</button>}
    <form onSubmit={send} className={styles.composer}>
      <label htmlFor="chat-message">告訴小幫手你的照顧需求</label>
      <textarea id="chat-message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} rows={3} disabled={loading || sending || needsReload} placeholder="例如：我想幫家人申請長照，不知道從哪裡開始" aria-describedby="chat-hint" />
      <div className={styles.actions}><span id="chat-hint" className="small muted">{draft.length} / 4000 字 · 顯示最近 20 則歷史紀錄</span><button className="button primary" disabled={loading || sending || needsReload || !draft.trim()}>{sending ? "回覆中…" : "傳送訊息"}</button></div>
    </form>
  </section>;
}

"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/fetch-api";
import type { CareCaseListItem } from "@/features/care-cases/api";

export function CaseActions({ careCase }: { careCase: CareCaseListItem }) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [action, setAction] = useState("note");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const summary = new FormData(form).get("summary");
    busy.current = true;
    setPending(true);
    setMessage("");
    setMessageType(null);
    try {
      const result = await fetchApi<{ success: boolean }>(`/api/admin/care-cases/${careCase.id}/actions`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, summary, expectedStatus: careCase.status }),
      });
      if (result.success !== true) throw new Error("Invalid response");
      form.reset();
      setMessage("已儲存，紀錄已加入案件時間線。");
      setMessageType("success");
      router.refresh();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error && error.message.endsWith("409")
        ? "狀態已變更、已結案或由其他專員承辦；請重新整理後確認。"
        : "未能確認儲存結果，請先重新整理查看時間線，避免重複送出。");
    } finally { busy.current = false; setPending(false); }
  }

  if (careCase.status === "closed") return <p className="case-detail-note">個案已結案，操作紀錄保留供查閱。</p>;
  return <form className="assessment-form" onSubmit={submit}>
    <p className="case-detail-note">未指定承辦人時，首次操作會由你承辦。處理紀錄不代表政府已核定申請。</p>
    <label htmlFor="case-action">專員操作</label>
    <select id="case-action" value={action} disabled={pending} onChange={(event) => setAction(event.target.value)}>
      <option value="note">新增聯絡／處理紀錄</option>
      <option value="follow_up">新增追蹤紀錄</option>
      {careCase.status === "new" && <option value="start">開始處理（轉為評估中）</option>}
      <option value="close">結案</option>
    </select>
    <label htmlFor="case-action-summary">{action === "close" ? "結案原因" : "處理內容"}</label>
    <textarea id="case-action-summary" name="summary" maxLength={4000} required rows={4} disabled={pending} />
    {action === "close" && <label><input type="checkbox" required disabled={pending} /> 我確認結案；目前不提供重新開案操作</label>}
    <button type="submit" disabled={pending}>{pending ? "儲存中…" : "確認操作並儲存"}</button>
    {message && <p className={`form-message ${messageType === "success" ? "form-message-success" : "form-message-error"}`} role={messageType === "error" ? "alert" : "status"}>{message}</p>}
  </form>;
}

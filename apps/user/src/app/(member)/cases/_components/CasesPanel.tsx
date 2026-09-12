"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/fetch-api";
import { caseStatusLabel, readCaseData, readCaseDetail, type CaseData } from "./case-data";
import styles from "./cases-panel.module.css";
import CareReport from "./CareReport";

function _formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function CasesPanel({ detail, onReturnToChat }: { detail?: { id: string; kind: "case" | "draft" }; onReturnToChat?: () => void }) {
  const id = detail?.id;
  const kind = detail?.kind;
  const [data, setData] = useState<CaseData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    let active = true;
    const path = id && kind ? `/api/${kind === "draft" ? "case-drafts" : "cases"}/${encodeURIComponent(id)}` as const : "/api/cases";
    fetchApi<unknown>(path, { credentials: "include", cache: "no-store", signal: controller.signal })
      .then((value) => kind ? readCaseDetail(value, kind) : readCaseData(value))
      .then((result) => { if (active) setData(result); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error && cause.message.includes("status 401")
          ? "登入已過期，請重新登入後查看案件。"
          : cause instanceof Error && /status (400|404)/.test(cause.message)
            ? "找不到此案件或草稿，可能已更新，請返回列表查看。"
            : "暫時無法讀取案件，請稍後重試。這不代表你的案件已被刪除。");
      })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [version, id, kind]);

  function refresh() {
    setLoading(true);
    setError("");
    setData(null);
    setVersion((current) => current + 1);
  }

  return <div className={styles.panel}>
    {detail && !onReturnToChat && <Link className="quiet-link" href="/cases">← 返回我的案件</Link>}
    <div className={styles.toolbar}><p className="muted">確認小幫手整理的需求、待補資訊與服務建議。</p><button className="button secondary" onClick={refresh} disabled={loading}>{loading ? "讀取中…" : "更新案件"}</button></div>
    <p className={styles.notice}>案件狀態表示本系統目前的處理進度，不代表長照資格、給付額度或服務已核定。</p>
    {loading ? <section className="empty-state" role="status">正在讀取你的案件…</section>
      : error ? <section className="empty-state"><p role="alert">{error}</p><div className={styles.actions}><button className="button secondary" onClick={refresh}>重新讀取</button><Link href="/login" className="quiet-link">前往登入</Link></div></section>
      : data && detail ? <>{data.drafts.map((item) => <CareReport key={item.id} item={item} onReturnToChat={onReturnToChat} />)}{data.cases.map((item) => <CareReport key={item.id} item={item} onReturnToChat={onReturnToChat} />)}</>
      : data && <>
        {data.drafts.length === 0 && data.cases.length === 0 ? <section className="empty-state"><h2>目前還沒有申請準備紀錄</h2><p>先和智慧小幫手聊聊照顧需求，開始整理申請資料。</p><Link href="/chat" className="button primary">開始整理需求</Link></section> : null}
        {data.drafts.length > 0 && <section className={styles.section} aria-labelledby="drafts-title"><h2 id="drafts-title">資料收集中 <span className={styles.count}>{data.drafts.length}</span></h2>{data.drafts.map((draft) => <article className={styles.card} key={draft.id}>
          <div className={styles.cardHeading}><h3><Link className={styles.cardLink} href={`/cases/drafts/${draft.id}`}>{draft.targetName || "尚未填寫照顧對象"}</Link></h3><span className={styles.badge}>資料收集中</span></div>
          <p className={styles.meta}>{draft.jurisdiction || "服務縣市待確認"} · 更新於 <time dateTime={draft.updatedAt}>{_formatDate(draft.updatedAt)}</time></p>
          <p className={styles.summary}>{draft.summary || "小幫手尚在整理照顧需求。"}</p>
          <p className={styles.meta}>尚待確認 {draft.missingFields.length} 項資訊 · 查看草稿 →</p>
        </article>)}</section>}
        {data.cases.length > 0 && <section className={styles.section} aria-labelledby="cases-title"><h2 id="cases-title">已建立案件 <span className={styles.count}>{data.cases.length}</span></h2>{data.cases.map((item) => <article className={styles.card} key={item.id}>
          <div className={styles.cardHeading}><h3><Link className={styles.cardLink} href={`/cases/${item.id}`}>{item.targetName}</Link></h3><span className={styles.badge}>{caseStatusLabel(item.caseStatus)}</span></div>
          <p className={styles.meta}>更新於 <time dateTime={item.updatedAt}>{_formatDate(item.updatedAt)}</time></p>
          <p className={styles.summary}>{item.summary}</p>
          <p className={styles.meta}>{item.services.length} 項服務建議 · 查看案件詳情 →</p>
        </article>)}</section>}
      </>}
  </div>;
}

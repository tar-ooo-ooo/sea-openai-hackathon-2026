import Link from "next/link";

import { demoCase, demoInboxItems, demoStats } from "@/features/case-demo/demo-data";

export default function Home() {
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">TODAY&apos;S WORKSPACE</p>
          <h1>今天需要處理什麼？</h1>
          <p>依優先順序整理新照會、服務異常與照護狀況異動。</p>
        </div>
        <span className="demo-notice">Demo 模擬資料・不會寫入資料庫</span>
      </section>

      <section aria-label="案件摘要" className="stat-grid">
        {demoStats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
            <span>{stat.note}</span>
          </article>
        ))}
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">PRIORITY INBOX</p>
            <h2>優先處理</h2>
          </div>
          <span>依風險與時效排序</span>
        </div>
        <div className="inbox-list">
          {demoInboxItems.map((item) => (
            <article className="inbox-card" key={item.title}>
              <div className={`priority-mark priority-${item.priority}`} aria-hidden="true" />
              <div className="inbox-content">
                <div className="item-meta">
                  <span className={`status-tag status-${item.kind}`}>{item.kindLabel}</span>
                  <span>{item.time}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
                <p className="ai-note"><span>AI 建議・尚未確認</span>{item.suggestion}</p>
              </div>
              <Link className="text-link" href={item.href}>{item.action}<span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="next-step-card">
        <div>
          <p className="eyebrow">DEMO FLOW</p>
          <h2>{demoCase.name}的個案流程</h2>
          <p>從新照會開始，依序檢視個案、確認照顧計畫、媒合服務並處理照護異動。</p>
        </div>
        <Link className="primary-link" href="/cases/demo">開始接案 <span aria-hidden="true">→</span></Link>
      </section>
    </>
  );
}

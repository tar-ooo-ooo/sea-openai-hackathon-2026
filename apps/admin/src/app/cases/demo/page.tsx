import Link from "next/link";

import { demoCase, demoServices } from "@/features/case-demo/demo-data";

export default function DemoCasePage() {
  return (
    <>
      <section className="case-header">
        <div className="case-identity">
          <div className="case-avatar" aria-hidden="true">王</div>
          <div className="case-title"><p className="eyebrow">CASE 360・DEMO</p><h1>{demoCase.name}</h1><p className="case-summary">{demoCase.age} 歲・CMS {demoCase.cmsLevel}・個案進行中</p></div>
        </div>
        <div className="case-links"><Link href="/cases/demo/care-plan">Review Care Plan</Link><Link href="/cases/demo/matching">服務媒合</Link><Link href="/cases/demo/follow-up">追蹤與異動</Link></div>
      </section>

      <section className="detail-grid">
        <article className="detail-card">
          <header><h2>正式長照資料</h2><span className="status-tag status-official">正式資料</span></header>
          <dl>
            <dt>CMS 等級</dt><dd>CMS {demoCase.cmsLevel}</dd>
            <dt>評估完成</dt><dd>2026/09/08</dd>
            <dt>目前階段</dt><dd>{demoCase.stage}</dd>
            <dt>照管中心</dt><dd>新北市照管中心</dd>
            <dt>A 單位</dt><dd>XX 社區整合型服務中心</dd>
            <dt>個案管理員</dt><dd>陳怡安</dd>
          </dl>
        </article>

        <article className="detail-card">
          <header><h2>Current Care State</h2><span className="status-tag status-ai">AI 分析</span></header>
          <ul className="care-list">
            <li><span>移動</span><strong>需協助</strong></li><li><span>沐浴</span><strong>需協助</strong></li><li><span>如廁</span><strong>部分協助</strong></li><li><span>進食</span><strong>可自行完成</strong></li><li><span>家庭照護</span><strong>女兒白天工作</strong></li><li><span>近期需求</span><strong>每週三復健</strong></li>
          </ul>
          <p className="ai-note"><span>AI 分析</span>照顧者負荷偏高，浴室環境與移位需求值得持續注意。</p>
        </article>

        <article className="detail-card">
          <header><h2>Current Care Plan</h2><span className="status-tag status-official">正式資料</span></header>
          <ul className="service-list">{demoServices.map((service) => <li key={service.name}><span>{service.name}</span><strong>{service.status}</strong></li>)}</ul>
        </article>

        <article className="detail-card">
          <header><h2>AI Action Inbox</h2><span className="status-tag status-ai">尚未確認</span></header>
          <p className="ai-note"><span>AI 建議</span>先確認居家照顧與交通接送的案家意願，再進入媒合。</p>
          <p className="ai-note"><span>AI 建議</span>安排浴室扶手與移位輔具評估，降低居家跌倒風險。</p>
        </article>
      </section>

      <section className="timeline-card" aria-labelledby="timeline-heading">
        <div className="section-heading"><div><p className="eyebrow">TIMELINE</p><h2 id="timeline-heading">案件時間線</h2></div></div>
        <ol className="timeline-list">
          <li><time>09/12</time><p>照管中心照會至 A 單位，等待個管員開始接案。</p></li>
          <li><time>09/08</time><p>正式評估完成，CMS 5 核定。</p></li>
          <li><time>09/05</time><p>個案中風出院，家屬提出長照服務需求。</p></li>
        </ol>
      </section>
    </>
  );
}

import Link from "next/link";

import { DemoActionButton } from "@/components/DemoActionButton";

export default function MatchingPage() {
  return (
    <>
      <section className="case-header">
        <div className="case-title"><p className="eyebrow">SERVICE MATCHING・DEMO</p><h1>居家照顧服務媒合</h1><p className="case-summary">此頁展示 Care Plan 確認後，如何連結實際服務單位。</p></div>
        <div className="case-links"><Link href="/cases/demo/care-plan">回 Care Plan</Link><Link href="/cases/demo/follow-up">追蹤與異動</Link></div>
      </section>

      <section className="plan-layout">
        <div>
          <article className="plan-card"><header><h2>服務需求摘要</h2><span className="status-tag status-official">正式資料</span></header><div className="matching-facts"><div><span>服務</span><strong>居家照顧</strong></div><div><span>地區</span><strong>板橋</strong></div><div><span>需求時段</span><strong>週一至週五 09:00–12:00</strong></div><div><span>主要需求</span><strong>沐浴、移位、日常生活協助</strong></div></div></article>
          <article className="plan-card matching-card">
            <div><header><h2>A 居家長照機構</h2><span className="status-tag status-ai">AI 推薦</span></header><p>量能與需求時段皆符合，為本次 Demo 中最適合的服務單位。</p><div className="matching-facts"><div><span>服務區域</span><strong>板橋</strong></div><div><span>量能</span><strong>有</strong></div><div><span>最快開始</span><strong>09/15</strong></div><div><span>距離</span><strong>1.1 km</strong></div></div></div>
            <div><p className="ai-note"><span>AI 建議</span>可優先聯絡此單位確認接案。</p><DemoActionButton label="選擇此單位" /></div>
          </article>
        </div>
        <aside><article className="plan-card"><header><h2>媒合進度</h2><span className="status-tag status-review">媒合中</span></header><ol className="timeline-list"><li><time>1</time><p>已納入 Care Plan</p></li><li><time>2</time><p><strong>待媒合</strong></p></li><li><time>3</time><p>已照會服務單位</p></li><li><time>4</time><p>單位接受 → 等待首次服務</p></li></ol></article></aside>
      </section>
    </>
  );
}

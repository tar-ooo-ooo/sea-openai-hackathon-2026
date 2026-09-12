import Link from "next/link";

import { DemoActionButton } from "@/components/DemoActionButton";

export default function FollowUpPage() {
  return (
    <>
      <section className="case-header">
        <div className="case-title"><p className="eyebrow">FOLLOW-UP & RE-PLAN・DEMO</p><h1>追蹤與照顧計畫異動</h1><p className="case-summary">將家屬回報轉成可由個管員判斷與處理的 Action Item。</p></div>
        <div className="case-links"><Link href="/cases/demo">回 Case 360</Link><Link href="/cases/demo/care-plan">查看原 Care Plan</Link></div>
      </section>

      <section className="plan-layout">
        <div>
          <article className="plan-card"><header><h2>最新追蹤事件</h2><span className="status-tag status-official">家屬回報・Demo</span></header><p className="plan-goal">「媽媽最近腰受傷，晚上也沒辦法幫爸爸起身。」</p><p className="ai-note"><span>AI 分析</span>主要照顧者照顧能力下降，夜間移位風險與照顧負荷可能升高。</p><DemoActionButton label="建立追蹤紀錄" /></article>
          <article className="plan-card replan-card"><header><h2>Re-plan 建議</h2><span className="status-tag status-ai">AI 建議・尚未確認</span></header><ul className="recommendation-list"><li><h3>維持：居家照顧、交通接送</h3><p>目前服務仍符合日間照護與復健需求。</p></li><li><h3>建議新增：喘息服務</h3><p>可與家庭討論夜間照護支持與喘息需求。</p></li><li><h3>複評提醒</h3><p>AI 不判定 CMS；是否通報照管中心，應由個管員依正式流程決定。</p></li></ul><DemoActionButton label="建立 Care Plan 異動" /></article>
        </div>
        <aside><article className="plan-card"><header><h2>個管員決策</h2><span className="status-tag status-review">等待 Review</span></header><div className="decision-grid"><div className="decision-row"><strong>原方案</strong>居家照顧與交通接送服務中；喘息服務未使用。</div><div className="decision-row"><strong>新事件</strong>主要照顧者腰部受傷，夜間照顧能力下降。</div><div className="decision-row"><strong>下一步</strong>確認家庭需求，再決定是否調整計畫或通報複評。</div></div><DemoActionButton label="通報複評" /></article></aside>
      </section>
    </>
  );
}

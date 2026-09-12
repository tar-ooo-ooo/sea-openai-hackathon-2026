import Link from "next/link";

import { DemoActionButton } from "@/components/DemoActionButton";
import { demoCase, demoRecommendations } from "@/features/case-demo/demo-data";

export default function CarePlanPage() {
  return (
    <>
      <section className="case-header">
        <div className="case-title"><p className="eyebrow">CARE PLAN REVIEW・DEMO</p><h1>{demoCase.name}的照顧計畫</h1><p className="case-summary">AI 草擬後，仍須由個管員 Review 並確認案家意願。</p></div>
        <div className="case-links"><Link href="/cases/demo">回 Case 360</Link><Link href="/cases/demo/matching">前往服務媒合</Link></div>
      </section>

      <section className="plan-layout">
        <div>
          <article className="plan-card"><header><h2>照顧目標</h2><span className="status-tag status-ai">AI Draft</span></header><p className="plan-goal">維持個案在宅生活能力，補足週間白天照顧人力，並確保復健與移動需求。</p><DemoActionButton label="修改照顧目標" /></article>
          <article className="plan-card">
            <header><h2>服務建議</h2><span className="status-tag status-ai">AI 建議・尚未確認</span></header>
            <ul className="recommendation-list">{demoRecommendations.map((recommendation) => <li key={recommendation.name}><h3>{recommendation.name}</h3><p>{recommendation.reason}</p><div className="recommendation-meta"><span>{recommendation.priority}</span><span>{recommendation.recommendation}</span></div><DemoActionButton label="Review 此建議" /></li>)}</ul>
          </article>
        </div>
        <aside><article className="plan-card"><header><h2>決策脈絡</h2><span className="status-tag status-official">待確認</span></header><div className="decision-grid"><div className="decision-row"><strong>AI 建議</strong>居家照顧、交通接送、輔具評估。</div><div className="decision-row"><strong>個管員判斷</strong>尚未 Review。</div><div className="decision-row"><strong>案家意願</strong>尚未確認。</div><div className="decision-row"><strong>最終結果</strong>尚未建立正式 Care Plan。</div></div><DemoActionButton label="確認案家意願" /></article></aside>
      </section>
    </>
  );
}

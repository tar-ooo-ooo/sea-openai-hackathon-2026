import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { loadCareCase } from "@/features/care-cases/api";
import { AssessmentForm } from "./_components/AssessmentForm";
import { CaseActions } from "./_components/CaseActions";

function _formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(value));
}

const _stageLabel = {
  new: "新轉介",
  assessing: "評估中",
  plan_review: "計畫審核",
  matching: "媒合中",
  following_up: "追蹤中",
  closed: "已結案",
} as const;

export default async function CareCasePage({
  params,
}: Readonly<{ params: Promise<{ caseId: string }> }>) {
  const session = (await cookies()).get("care_admin_session");
  const careCase = await loadCareCase(
    `${session?.name}=${session?.value}`,
    (await params).caseId,
  );
  if (!careCase) notFound();

  return (
    <>
      <section className="case-header">
        <div className="case-identity">
          <span className="case-avatar" aria-hidden="true">案</span>
          <div className="case-title">
            <p className="eyebrow">CARE CASE 360</p>
            <h1>{careCase.recipientName}</h1>
            <p className="case-summary">{careCase.referralSummary}</p>
          </div>
        </div>
        <div className="case-links"><Link href="/">返回案件工作台</Link></div>
      </section>

      <section className="detail-grid">
        <article className="detail-card">
          <header><h2>案件狀態</h2><span className="status-tag status-referral">{_stageLabel[careCase.status]}</span></header>
          <dl>
            <dt>接案時間</dt><dd>{_formatDate(careCase.acceptedAt)}</dd>
            <dt>優先程度</dt><dd>{careCase.priority}</dd>
            <dt>地區</dt><dd>{careCase.area ?? "待補充"}</dd>
            <dt>來源</dt><dd>{careCase.sourceApplicationPackageId ? <Link href={`/cases/${careCase.sourceApplicationPackageId}`}>查看正式申請內容</Link> : "尚未記錄申請來源"}</dd>
          </dl>
        </article>
        <article className="detail-card">
          <header><h2>目前評估</h2></header>
          {careCase.latestAssessment ? (
            <dl>
              <dt>CMS</dt><dd>{careCase.latestAssessment.cmsLevel ?? "待補充"}</dd>
              <dt>評估時間</dt><dd>{_formatDate(careCase.latestAssessment.assessedAt)}</dd>
              <dt>摘要</dt><dd>{careCase.latestAssessment.summary ?? "待補充"}</dd>
            </dl>
          ) : <p className="case-detail-note">尚未建立正式評估快照。</p>}
          {careCase.status !== "closed" && <AssessmentForm careCaseId={careCase.id} />}
        </article>
      </section>

      <section className="content-section detail-card">
        <header><h2>專員處理</h2></header>
        <CaseActions key={careCase.status} careCase={careCase} />
      </section>

      <section className="detail-grid content-section">
        <article className="detail-card">
          <header><h2>照護計畫</h2></header>
          {careCase.currentPlan ? (
            <>
              <p className="case-detail-note">v{careCase.currentPlan.version} · {careCase.currentPlan.status}</p>
              <p className="case-detail-note">{careCase.currentPlan.goal}</p>
            </>
          ) : <p className="case-detail-note">尚未建立照護計畫。</p>}
        </article>
        <article className="detail-card">
          <header><h2>待辦事項</h2></header>
          {careCase.actionItems.length === 0
            ? <p className="case-detail-note">目前沒有未完成待辦。</p>
            : <ul className="care-list">{careCase.actionItems.map((item) => <li key={item.id}>{item.title}<strong>{item.priority}</strong></li>)}</ul>}
        </article>
      </section>

      <section className="content-section" aria-labelledby="care-case-timeline-heading">
        <div className="section-heading"><div><p className="eyebrow">TIMELINE</p><h2 id="care-case-timeline-heading">案件時間線</h2></div></div>
        {careCase.events.length === 0 ? <p className="empty-state">目前尚無案件事件。</p> : (
          <ol className="timeline-list">{careCase.events.map((event) => (
            <li key={event.id}><time>{_formatDate(event.occurredAt)}</time><p>{event.summary}</p></li>
          ))}</ol>
        )}
      </section>
    </>
  );
}

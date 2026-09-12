import Link from "next/link";
import { cookies } from "next/headers";

import { loadCareCases, type CareCaseListItem } from "@/features/care-cases/api";
import { loadAdminTriages, type AdminTriage } from "@/features/admin-triages/api";
import { loadAdminCases, type AdminCaseListItem } from "@/features/admin-cases/api";
import { StartCaseButton } from "./_components/StartCaseButton";
import styles from "./application-inbox.module.css";

function _formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(value));
}

const _stageLabel: Record<CareCaseListItem["status"], string> = {
  new: "已收件",
  assessing: "評估中",
  plan_review: "計畫審核",
  matching: "媒合中",
  following_up: "追蹤中",
  closed: "已結案",
};

export default async function Home() {
  const session = (await cookies()).get("care_admin_session");
  let careCases: CareCaseListItem[] = [];
  let triages: AdminTriage[] = [];
  let hasTriageError = false;
  let hasServiceError = false;
  let applications: AdminCaseListItem[] = [];
  let hasApplicationError = false;

  try {
    applications = await loadAdminCases(`${session?.name}=${session?.value}`);
  } catch {
    hasApplicationError = true;
  }

  try {
    careCases = await loadCareCases(`${session?.name}=${session?.value}`);
  } catch {
    hasServiceError = true;
  }
  try {
    triages = await loadAdminTriages(`${session?.name}=${session?.value}`);
  } catch {
    hasTriageError = true;
  }

  const newCasesByApplicationId = new Map(careCases
    .filter((careCase) => careCase.status === "new" && careCase.sourceApplicationPackageId)
    .map((careCase) => [careCase.sourceApplicationPackageId as string, careCase]));
  const pendingApplications = applications.filter((application) => newCasesByApplicationId.has(application.id));
  const activeCareCases = careCases.filter((careCase) => careCase.status !== "new");
  const hasInboxError = hasApplicationError || hasServiceError;

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">CASE WORKSPACE</p>
          <h1>申請案件工作台</h1>
          <p>檢視民眾的長照需求、緊急分流紀錄與已接案個案。</p>
        </div>
        <form action="/" method="get"><button className="text-link" type="submit">重新整理工作台</button></form>
      </section>

      <section className="content-section" aria-labelledby="triages-heading">
        <div className="section-heading">
          <div><p className="eyebrow">EMERGENCY TRIAGE</p><h2 id="triages-heading">緊急與追蹤分流</h2></div>
          {!hasTriageError && <span>{triages.length} 筆</span>}
        </div>
        <p className="case-detail-note">以下為帳號使用者的分流紀錄；聯絡資料是目前個人檔案，不代表被照顧者。分流程度不等於處理狀態。</p>
        {hasTriageError ? <p className="empty-state">暫時無法取得分流資料，請重新整理。</p>
          : triages.length === 0 ? <p className="empty-state">目前沒有緊急或追蹤分流紀錄。</p>
            : <div className="inbox-list">{triages.map((triage) => (
              <article className="inbox-card" key={triage.id}>
                <div className={`priority-mark ${triage.urgency === "emergency" ? "priority-high" : "priority-medium"}`} aria-hidden="true" />
                <div className="inbox-content">
                  <div className="item-meta"><span className="status-tag">{triage.urgency === "emergency" ? "緊急" : "需追蹤"}</span><time dateTime={triage.createdAt}>{_formatDate(triage.createdAt)}</time></div>
                  <h3>{triage.name ?? "使用者尚未填寫姓名"}</h3>
                  <p>聯絡電話：{triage.phone || "尚未提供"} · 地區：{triage.area || "尚未提供"}</p>
                  <blockquote className="triage-message"><strong>原始訊息</strong><span>{triage.message ?? "此筆既有紀錄未保存原始訊息"}</span></blockquote>
                  <details><summary>查看紀錄資訊</summary><dl><dt>分流編號</dt><dd>{triage.id}</dd><dt>使用者編號</dt><dd>{triage.userId}</dd></dl></details>
                </div>
              </article>
            ))}</div>}
      </section>

      <section className={styles.inbox} aria-labelledby="application-cases-heading">
        <div className={styles.heading}>
          <div>
            <p className="eyebrow">APPLICATION INBOX</p>
            <h2 id="application-cases-heading">申請資料列表</h2>
          </div>
          {!hasInboxError && <span className={styles.count}>{pendingApplications.length} 筆待接案</span>}
        </div>
        <p className={styles.notice}><strong>待接案申請</strong><span>只顯示民眾已送出、尚未由專員開始處理的案件；開始接案後會移至正式個案清單。</span></p>
        {hasInboxError ? <p className="empty-state">暫時無法取得待接案資料，請重新整理。</p>
          : pendingApplications.length === 0 ? <p className="empty-state">目前沒有等待接案的申請。</p>
            : <div className={styles.list}>{pendingApplications.map((application) => (
              <article className={styles.card} key={application.id}>
                <div className={styles.identity}>
                  <span className={styles.avatar} aria-hidden="true">{Array.from(application.targetName)[0] || "申"}</span>
                  <div><p className={styles.label}>被照顧者</p><h3>{application.targetName}</h3></div>
                </div>
                <p className={styles.summary}>{application.summary || "尚未提供申請摘要，請開啟明細查看表單。"}</p>
                <div className={styles.meta}>
                  <span className={styles.serviceCount}>服務需求 <strong>{application.serviceCount}</strong> 項</span>
                  <span>更新於 <time dateTime={application.updatedAt}>{_formatDate(application.updatedAt)}</time></span>
                </div>
                <div className={styles.footer}>
                  <span className={styles.pending}>等待接案</span>
                  <div className={styles.actions}>
                    <Link className={styles.detailLink} href={`/cases/${application.id}`} aria-label={`查看${application.targetName}的申請明細`}>查看完整明細</Link>
                    <StartCaseButton careCaseId={newCasesByApplicationId.get(application.id)!.id} />
                  </div>
                </div>
              </article>
            ))}</div>}
      </section>
      <section className="content-section" aria-labelledby="care-cases-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FORMAL CARE CASES</p>
            <h2 id="care-cases-heading">正式申請案件</h2>
          </div>
          {!hasServiceError && <span>{activeCareCases.length} 件</span>}
        </div>
        {hasServiceError ? <p className="empty-state">暫時無法取得正式個案資料。</p>
          : activeCareCases.length === 0 ? <p className="empty-state">目前沒有已開始處理的個案。</p>
            : <div className="inbox-list">{activeCareCases.map((careCase) => (
              <article className="inbox-card" key={careCase.id}>
                <div className="priority-mark priority-medium" aria-hidden="true" />
                <div className="inbox-content">
                  <div className="item-meta"><span className="status-tag status-review">{_stageLabel[careCase.status]}</span><span>{_formatDate(careCase.updatedAt)}</span></div>
                  <h3>{careCase.recipientName}</h3><p>{careCase.referralSummary}</p>
                  <p className="case-service-count">{careCase.sourceApplicationPackageId ? "正式申請來源" : "既有案件 · 來源待確認"}</p>
                </div>
                <Link className="text-link" href={`/care-cases/${careCase.id}`}>開啟 Case 360<span aria-hidden="true">→</span></Link>
              </article>
            ))}</div>}
      </section>

    </>
  );
}

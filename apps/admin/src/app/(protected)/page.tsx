import Link from "next/link";
import { cookies } from "next/headers";

import { loadCareCases, type CareCaseListItem } from "@/features/care-cases/api";
import { loadAdminTriages, type AdminTriage } from "@/features/admin-triages/api";

function _formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(value));
}

export default async function Home() {
  const session = (await cookies()).get("care_admin_session");
  let careCases: CareCaseListItem[] = [];
  let triages: AdminTriage[] = [];
  let hasTriageError = false;
  let hasServiceError = false;

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
                  <details><summary>查看紀錄資訊</summary><dl><dt>分流編號</dt><dd>{triage.id}</dd><dt>使用者編號</dt><dd>{triage.userId}</dd><dt>事件描述</dt><dd>目前資料來源尚未提供</dd></dl></details>
                </div>
              </article>
            ))}</div>}
      </section>

      <section className="content-section case-workspace-section" aria-labelledby="application-cases-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">APPLICATION INBOX</p>
            <h2 id="application-cases-heading">正式申請收件</h2>
          </div>
          <span className="status-tag status-referral">尚未啟用</span>
        </div>
        <p className="empty-state">正式申請收件功能尚未啟用，目前無法查詢申請。啟用後只會顯示民眾已確認送出的申請，供專員檢視與接案。</p>
      </section>

      <section className="content-section" aria-labelledby="care-cases-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FORMAL CARE CASES</p>
            <h2 id="care-cases-heading">已接案個案</h2>
          </div>
          {!hasServiceError && <span>{careCases.length} 件</span>}
        </div>
        {hasServiceError ? <p className="empty-state">暫時無法取得正式個案資料。</p>
          : careCases.length === 0 ? <p className="empty-state">目前沒有已接案個案。正式申請收件啟用後，才能新增接案。</p>
            : <div className="inbox-list">{careCases.map((careCase) => (
              <article className="inbox-card" key={careCase.id}>
                <div className="priority-mark priority-medium" aria-hidden="true" />
                <div className="inbox-content">
                  <div className="item-meta"><span className="status-tag status-review">{careCase.status}</span><span>{_formatDate(careCase.updatedAt)}</span></div>
                  <h3>{careCase.recipientName}</h3><p>{careCase.referralSummary}</p>
                  <p className="case-service-count">{careCase.sourceApplicationPackageId ? "既有個案 · 聊天需求來源（非正式申請送出）" : "既有個案 · 來源待確認"}</p>
                </div>
                <Link className="text-link" href={`/care-cases/${careCase.id}`}>開啟 Case 360<span aria-hidden="true">→</span></Link>
              </article>
            ))}</div>}
      </section>

      <section className="next-step-card">
        <div>
          <p className="eyebrow">DEMO FLOW</p>
          <h2>繼續查看後台 Demo</h2>
          <p>Demo 保留用來討論 Care 360、照護計畫、媒合與追蹤的介面流程，尚未連結正式資料。</p>
        </div>
        <Link className="primary-link" href="/cases/demo">開啟 Demo <span aria-hidden="true">→</span></Link>
      </section>
    </>
  );
}

import Link from "next/link";
import { cookies } from "next/headers";

import { loadAdminCases, type AdminCaseListItem } from "@/features/admin-cases/api";

function _formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(value));
}

export default async function Home() {
  const session = (await cookies()).get("care_admin_session");
  let adminCases: AdminCaseListItem[] = [];
  let hasServiceError = false;

  try {
    adminCases = await loadAdminCases(`${session?.name}=${session?.value}`);
  } catch {
    hasServiceError = true;
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">CASE WORKSPACE</p>
          <h1>申請案件工作台</h1>
          <p>這裡顯示使用者已送出的服務申請，供專員先檢視需求與服務項目。</p>
        </div>
        <span className="demo-notice">唯讀資料 · 正式照護流程待資料契約確認</span>
      </section>

      <section className="content-section case-workspace-section" aria-labelledby="application-cases-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">APPLICATION CASES</p>
            <h2 id="application-cases-heading">已送出申請</h2>
          </div>
          {!hasServiceError && <span>{adminCases.length} 件</span>}
        </div>

        {hasServiceError ? (
          <p className="empty-state">暫時無法取得案件資料，請確認 API 與資料庫服務後再重新整理。</p>
        ) : adminCases.length === 0 ? (
          <p className="empty-state">目前尚無已送出的申請案件。</p>
        ) : (
          <div className="inbox-list">
            {adminCases.map((adminCase) => (
              <article className="inbox-card" key={adminCase.id}>
                <div className="priority-mark priority-low" aria-hidden="true" />
                <div className="inbox-content">
                  <div className="item-meta">
                    <span className="status-tag status-referral">申請案件</span>
                    <span>{_formatDate(adminCase.updatedAt)}</span>
                  </div>
                  <h3>{adminCase.targetName}</h3>
                  <p>{adminCase.summary}</p>
                  <p className="case-service-count">已選 {adminCase.serviceCount} 項服務</p>
                </div>
                <Link className="text-link" href={`/cases/${adminCase.id}`}>
                  查看申請<span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        )}
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

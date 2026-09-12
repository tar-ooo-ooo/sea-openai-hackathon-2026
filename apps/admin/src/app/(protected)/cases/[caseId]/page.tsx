import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Fragment } from "react";

import { loadAdminCase } from "@/features/admin-cases/api";

function _formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(value));
}

export default async function AdminCasePage({
  params,
}: Readonly<{ params: Promise<{ caseId: string }> }>) {
  const session = (await cookies()).get("care_admin_session");
  const adminCase = await loadAdminCase(
    `${session?.name}=${session?.value}`,
    (await params).caseId,
  );
  if (!adminCase) notFound();

  return (
    <>
      <section className="case-header">
        <div className="case-identity">
          <span className="case-avatar" aria-hidden="true">需</span>
          <div className="case-title">
            <p className="eyebrow">CARE NEEDS RECORD</p>
            <h1>{adminCase.targetName}</h1>
            <p className="case-summary">{adminCase.summary}</p>
          </div>
        </div>
        <div className="case-links">
          <Link href="/">返回案件工作台</Link>
        </div>
      </section>

      <section className="detail-grid">
        <article className="detail-card">
          <header><h2>申請資料摘要</h2><span className="status-tag status-referral">已送出 · 唯讀</span></header>
          <dl>
            <dt>申請資料編號</dt><dd style={{ overflowWrap: "anywhere" }}>{adminCase.id}</dd>
            <dt>需求整理時間</dt><dd>{_formatDate(adminCase.createdAt)}</dd>
            <dt>最後更新</dt><dd>{_formatDate(adminCase.updatedAt)}</dd>
            <dt>服務項目</dt><dd>{adminCase.serviceCount} 項</dd>
          </dl>
        </article>
        <article className="detail-card">
          <header><h2>申請與接案</h2></header>
          <p className="case-detail-note">民眾確認送出時已建立對應的正式案件；本頁顯示申請內容，案件後續處理請由 Case 360 進行。這不代表政府已核定資格、CMS 或服務額度。</p>
        </article>
      </section>

      <section className="content-section" aria-labelledby="application-details-heading">
        <div className="section-heading"><h2 id="application-details-heading">完整申請內容</h2></div>
        {adminCase.intake ? <>
          <p className="case-detail-note">表單最後更新：{_formatDate(adminCase.intake.updatedAt)}。未填欄位顯示「尚未提供」。</p>
          <div className="detail-grid">
            {adminCase.intake.sections.map((section) => (
              <article className="detail-card" key={section.title}>
                <header><h3>{section.title}</h3></header>
                <dl>{section.fields.map((field) => (
                  <Fragment key={field.label}>
                    <dt>{field.label}</dt><dd style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", minWidth: 0 }}>{field.value}</dd>
                  </Fragment>
                ))}</dl>
              </article>
            ))}
          </div>
        </> : <p className="empty-state">此筆既有申請沒有對應的完整表單，僅能顯示摘要與服務需求。</p>}
      </section>

      <section className="content-section" aria-labelledby="requested-services-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">REQUESTED SERVICES</p>
            <h2 id="requested-services-heading">紀錄中的服務需求</h2>
          </div>
          <span>{adminCase.services.length} 項</span>
        </div>
        <ul className="service-list application-service-list">
          {adminCase.services.map((service) => (
            <li key={service.id}>
              <div>
                <strong>{service.name}</strong>
                <p>{service.category} · {service.reason}</p>
              </div>
              <span>{service.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

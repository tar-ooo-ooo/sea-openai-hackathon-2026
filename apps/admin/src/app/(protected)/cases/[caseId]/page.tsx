import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

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
            <p className="eyebrow">CHAT CARE NEEDS</p>
            <h1>{adminCase.targetName}</h1>
            <p className="case-summary">{adminCase.summary}</p>
          </div>
        </div>
        <div className="case-links">
          <Link href="/">返回案件工作台</Link>
          <Link href="/cases/demo">查看 Demo 流程</Link>
        </div>
      </section>

      <section className="detail-grid">
        <article className="detail-card">
          <header><h2>聊天需求摘要</h2><span className="status-tag status-referral">非正式申請 · 唯讀</span></header>
          <dl>
            <dt>需求整理時間</dt><dd>{_formatDate(adminCase.createdAt)}</dd>
            <dt>最後更新</dt><dd>{_formatDate(adminCase.updatedAt)}</dd>
            <dt>服務項目</dt><dd>{adminCase.serviceCount} 項</dd>
          </dl>
        </article>
        <article className="detail-card">
          <header><h2>申請與接案</h2></header>
          <p className="case-detail-note">這是聊天中整理的照顧需求，尚非正式申請，不能在此接案。正式申請收件功能啟用後，請由收件區檢視民眾已確認送出的內容。</p>
        </article>
      </section>

      <section className="content-section" aria-labelledby="requested-services-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">REQUESTED SERVICES</p>
            <h2 id="requested-services-heading">聊天整理的服務建議</h2>
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

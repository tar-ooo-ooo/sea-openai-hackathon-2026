import Link from "next/link";
import type { CaseData } from "./case-data";
import styles from "./cases-panel.module.css";

export default function CareReport({ item }: { item: CaseData["drafts"][number] | CaseData["cases"][number] }) {
  const isDraft = "missingFields" in item;
  const missing = isDraft ? item.missingFields : [];
  const groups = [
    { title: "基本資料與聯絡方式", fields: missing.filter((field) => /姓名|身分|居留|電話|出生|地址|縣市|電子郵件|關係|居住/.test(field)) },
    { title: "同意與服務選擇", fields: missing.filter((field) => /同意|欲申請/.test(field)) },
    { title: "照顧需求與支持", fields: missing.filter((field) => !/姓名|身分|居留|電話|出生|地址|縣市|電子郵件|關係|居住|同意|欲申請/.test(field)) },
  ];
  return <article className={styles.report}>
    <header className={styles.reportHeader}><p className={styles.kicker}>長照申請準備紀錄</p><div className={styles.cardHeading}><h2>{item.targetName || "照顧對象待確認"}</h2><span className={styles.badge}>{isDraft ? "資料收集中" : "需求已整理"}</span></div><p className={styles.meta}>最後更新：<time dateTime={item.updatedAt}>{new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "medium", timeStyle: "short" }).format(new Date(item.updatedAt))}</time></p></header>
    <section className={styles.nextStep} aria-labelledby="next-step"><p className={styles.kicker}>目前準備進度</p><h3 id="next-step">{isDraft ? missing.length ? `還有 ${missing.length} 項資訊需要確認` : "資料已齊，等待整理成案件" : "需求與服務建議已整理，請先確認內容"}</h3><p>{isDraft ? "接下來先補充尚未確認的資訊，讓小幫手更完整地整理照顧需求。" : "請確認照顧需求與實際情況一致，再依申請管道確認後續安排。本頁不會自動送出申請。"}</p><Link className="button secondary" href="/chat">{isDraft ? "回到小幫手補充資料" : "和小幫手討論下一步"}</Link></section>
    <section className={styles.reportSection}><h3><span>01</span> 照顧需求摘要</h3><p className={styles.summary}>{item.summary || "尚未整理需求摘要，請先與小幫手確認目前的照顧困難。"}</p><p className={styles.meta}>以下依對話中已保存的描述整理，不代表醫療診斷或正式評估。</p>
      {item.careOverview?.length ? item.careOverview.map((group) => <div className={styles.overviewGroup} key={group.title}><h4>{group.title}</h4><dl>{group.items.map((field) => <div key={field.label}><dt>{field.label}</dt><dd className={field.value === null ? styles.unconfirmed : undefined}>{field.value ?? "尚未記錄"}</dd></div>)}</dl></div>) : <p className={styles.unconfirmed}>這筆紀錄尚未保存分項照顧資料，目前僅能查看上方摘要。</p>}
    </section>
    <section className={styles.reportSection}><h3><span>02</span> {isDraft ? "待補資訊" : "建議服務與原因"}</h3>
      {isDraft ? <>{groups.filter((group) => group.fields.length).map((group) => <div className={styles.overviewGroup} key={group.title}><h4>{group.title}</h4><ul className={styles.checklist}>{group.fields.map((field) => <li key={field}>{field}</li>)}</ul></div>)}{!missing.length && <p>必要資訊已填齊，請回到小幫手確認建立案件。</p>}</>
        : item.services.length ? <ol className={styles.serviceReport}>{[...item.services].sort((a, b) => a.position - b.position).map((service) => <li key={service.id}><div className={styles.serviceHeading}><div><p className={styles.meta}>{service.category}</p><h4>{service.name}</h4></div><span className={styles.badge}>{service.status}</span></div><p className={styles.reasonLabel}>為什麼建議這項服務</p><p className={styles.summary}>{service.reason || "尚未記錄建議原因，請與小幫手確認。"}</p></li>)}</ol> : <p className={styles.unconfirmed}>目前沒有服務項目，請與小幫手確認需要的協助。</p>}
    </section>
    <footer className={styles.reportFooter}><strong>申請前提醒</strong><p>請先核對這份紀錄。服務建議及資料整理不等於已送出、已受理或已核定；實際評估結果仍須由受理單位確認。</p><Link className="quiet-link" href="/cases">返回我的案件</Link></footer>
  </article>;
}

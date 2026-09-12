import Link from "next/link";
import { caseStatusLabel, type CaseData } from "./case-data";
import styles from "./cases-panel.module.css";

export default function CareReport({ item, onReturnToChat }: { item: CaseData["drafts"][number] | CaseData["cases"][number]; onReturnToChat?: () => void }) {
  const isDraft = "missingFields" in item;
  const missing = isDraft ? item.missingFields : [];
  const groups = [
    { title: "基本資料與聯絡方式", fields: missing.filter((field) => /姓名|身分|居留|電話|出生|地址|縣市|電子郵件|關係|居住/.test(field)) },
    { title: "同意與服務選擇", fields: missing.filter((field) => /同意|欲申請/.test(field)) },
    { title: "照顧需求與支持", fields: missing.filter((field) => !/姓名|身分|居留|電話|出生|地址|縣市|電子郵件|關係|居住|同意|欲申請/.test(field)) },
  ];
  return <article className={styles.report}>
    <header className={styles.reportHeader}><p className={styles.kicker}>長照申請準備紀錄</p><div className={styles.cardHeading}><h2>{item.targetName || "照顧對象待確認"}</h2><span className={styles.badge}>{isDraft ? "資料收集中" : caseStatusLabel(item.caseStatus)}</span></div><p className={styles.meta}>最後更新：<time dateTime={item.updatedAt}>{new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "medium", timeStyle: "short" }).format(new Date(item.updatedAt))}</time></p></header>
    <section className={styles.nextStep} aria-labelledby="next-step"><p className={styles.kicker}>目前準備進度</p><h3 id="next-step">{isDraft ? missing.length ? `還有 ${missing.length} 項資訊需要確認` : "資料已齊，等待整理成案件" : item.caseStatus ? `案件進度：${caseStatusLabel(item.caseStatus)}` : "這筆紀錄尚未建立正式案件"}</h3><p>{isDraft ? "接下來先補充尚未確認的資訊，讓小幫手更完整地整理照顧需求。" : item.caseStatus ? "這是本系統目前的案件處理進度；實際評估與核定結果仍由受理單位確認。" : "這是修正前建立的申請準備紀錄，目前沒有可追蹤的正式案件狀態。"}</p>{onReturnToChat ? <button type="button" className="button secondary" onClick={onReturnToChat}>內容需要調整，回到對話</button> : <Link className="button secondary" href="/chat">{isDraft ? "回到小幫手補充資料" : "和小幫手討論下一步"}</Link>}</section>
    <section className={styles.reportSection}><h3><span>01</span> 照顧需求摘要</h3><p className={styles.summary}>{item.summary || "尚未整理需求摘要，請先與小幫手確認目前的照顧困難。"}</p><p className={styles.meta}>以下依對話中已保存的描述整理，不代表醫療診斷或正式評估。</p>
      <p className={styles.fieldLegend}>已記錄：對話中保存的描述，仍請核對。尚未記錄：可再補充，不一定是申請必填項目。</p>
      {item.careOverview?.length ? item.careOverview.map((group) => <div className={styles.overviewGroup} key={group.title}><h4>{group.title}</h4><dl>{group.items.map((field) => <div key={field.label} className={field.value === null ? styles.missingField : undefined}><dt>{field.label}<span className={field.value === null ? styles.missingTag : styles.recordedTag}>{field.value === null ? "尚未記錄" : "已記錄"}</span></dt><dd className={field.value === null ? styles.unconfirmed : undefined}>{field.value ?? "可回到對話補充此項照顧情況"}</dd></div>)}</dl></div>) : <p className={styles.unconfirmed}>這筆紀錄尚未保存分項照顧資料，目前僅能查看上方摘要。</p>}
    </section>
    <section className={styles.reportSection}><h3><span>02</span> {isDraft ? "待補資訊" : "建議服務與原因"}</h3>
      {isDraft ? <>{groups.filter((group) => group.fields.length).map((group) => <div className={styles.overviewGroup} key={group.title}><h4>{group.title}</h4><ul className={styles.checklist}>{group.fields.map((field) => <li key={field}>{field}</li>)}</ul></div>)}{!missing.length && <p>必要資訊已填齊，請回到小幫手確認建立案件。</p>}</>
        : item.services.length ? <ol className={styles.serviceReport}>{[...item.services].sort((a, b) => a.position - b.position).map((service) => <li key={service.id}><div className={styles.serviceHeading}><div><p className={styles.meta}>{service.category}</p><h4>{service.name}</h4></div><span className={styles.badge}>{service.status}</span></div><p className={styles.reasonLabel}>為什麼建議這項服務</p><p className={styles.summary}>{service.reason || "尚未記錄建議原因，請與小幫手確認。"}</p></li>)}</ol> : <p className={styles.unconfirmed}>目前沒有服務項目，請與小幫手確認需要的協助。</p>}
    </section>
    <footer className={styles.reportFooter}><strong>{isDraft ? "申請前提醒" : "案件提醒"}</strong><p>{isDraft ? "請先核對這份紀錄。服務建議及資料整理不等於已送出、已受理或已核定。" : "案件狀態不等於資格、給付額度或服務核定；實際結果仍須由受理單位確認。"}</p>{onReturnToChat ? <button type="button" className="button secondary" onClick={onReturnToChat}>完成檢閱，返回對話</button> : <Link className="quiet-link" href="/cases">返回我的案件</Link>}{onReturnToChat && <p>返回對話不會送出申請，也不會記錄送件授權。</p>}</footer>
  </article>;
}

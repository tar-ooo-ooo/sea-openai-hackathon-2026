"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  Badge,
  Empty,
  Notice,
  PageHeading,
  dateTime,
  errorText,
  useSandbox,
} from "../../ui";

const journey = ["提出需求", "等待評估", "完成評估", "擬定計畫", "服務接續"];
export default function CasesPage() {
  const { id: rawId } = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const service = useSandbox();
  const status = id
    ? service.listCases().find((item) => item.id === id)?.application.status
    : "";
  return <CasesContent key={`${id ?? "list"}:${status}`} id={id} />;
}

function CasesContent({ id }: { id?: string }) {
  const search = useSearchParams();
  const service = useSandbox();
  const cases = service.listCases();
  const c = cases.find((x) => x.id === id);
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [address, setAddress] = useState(
    c?.application.amendment["recipient.currentAddress"] || "",
  );
  function amend(submit: boolean) {
    try {
      if (!c) return;
      setError("");
      if (submit && !confirm) throw new Error("請確認本次補件內容後再送出。");
      service.provideMissingInformation(c.id, {
        "recipient.currentAddress": address,
      });
      if (submit) service.submitAmendment(c.id);
      setFeedback(
        submit
          ? "補件已送出，案件回到等候受理。"
          : "補件草稿已保存，尚未送出。",
      );
      setConfirm(false);
    } catch (e) {
      setError(errorText(e));
    }
  }
  if (!id)
    return (
      <>
        <PageHeading
          eyebrow="CARE JOURNEY"
          title="申請案件與進度"
          description="查看申請、補充資料與到府評估安排。"
          action={
            <Link className="button primary" href="/apply">
              新增申請
              <ArrowRight size={17} />
            </Link>
          }
        />
        <section className="panel">
          <div className="panel-header">
            <h2>
              我的案件 <span className="muted small">{cases.length} 件</span>
            </h2>
            <div className="search-field">
              <Search size={17} />
              <input
                aria-label="搜尋案件"
                placeholder="搜尋姓名或案件編號"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          {cases.length ? (
            cases
              .filter((x) =>
                `${x.id}${x.recipient.name}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((x) => (
                <Link className="case-row" key={x.id} href={`/cases/${x.id}`}>
                  <span className="person-avatar">
                    {x.recipient.name[0] || "新"}
                  </span>
                  <div>
                    <strong>{x.recipient.name || "未填寫被照顧者"}</strong>
                    <small>
                      {x.id} · {x.jurisdiction || "尚未選擇縣市"} ·{" "}
                      {dateTime(x.updatedAt)}
                    </small>
                  </div>
                  <Badge status={x.application.status} />
                  <ChevronRight size={18} />
                </Link>
              ))
          ) : (
            <div className="empty-state">
              <FileText size={40} />
              <h3>目前還沒有案件</h3>
              <p>建立申請草稿後，你可以在這裡繼續追蹤。</p>
              <Link href="/apply" className="button secondary">
                開始申請
              </Link>
            </div>
          )}
          {cases.length > 0 &&
            !cases.some((x) =>
              `${x.id}${x.recipient.name}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            ) && (
              <div className="empty-state">
                沒有符合的案件，請調整搜尋文字。
              </div>
            )}
        </section>
      </>
    );
  if (!c)
    return (
      <Empty title="找不到這個案件">
        <p>案件可能已重置。請回到案件總覽。</p>
      </Empty>
    );
  const status = c.application.status;
  const progress =
    status === "DRAFT"
      ? 0
      : [
            "SUBMITTED",
            "NEEDS_MORE_INFORMATION",
            "ASSESSMENT_SCHEDULED",
            "RETURNED",
          ].includes(status)
        ? 1
        : status === "ASSESSMENT_COMPLETED"
          ? 2
          : status === "PROFESSIONAL_REVIEW"
            ? 3
            : 4;
  return (
    <>
      <Link className="back-link" href="/cases">
        <ArrowLeft size={15} />
        所有案件
      </Link>
      <PageHeading
        eyebrow={`CARE JOURNEY · ${c.id}`}
        title={c.recipient.name || "申請草稿"}
        description="查看本次申請的受理、補件與評估紀錄。"
        action={<Badge status={status} />}
      />
      {error && <Notice warning>{error}</Notice>}
      {feedback && <Notice>{feedback}</Notice>}
      {search.get("receipt") === "1" && status === "SUBMITTED" && (
        <section className="gov-receipt" aria-label="申辦收件證明">
          <h2>收件完成</h2>
          <p>
            您的申請已送出，請保留案件編號以查詢後續進度。收件不代表資格核定或服務核准。
          </p>
          <dl className="gov-information-table">
            <div>
              <dt>案件編號</dt>
              <dd>{c.id}</dd>
            </div>
            <div>
              <dt>申辦項目</dt>
              <dd>長期照顧服務需求申請</dd>
            </div>
            <div>
              <dt>收件時間</dt>
              <dd>{dateTime(c.application.submittedAt)}（臺北時間）</dd>
            </div>
            <div>
              <dt>聯絡人</dt>
              <dd>
                {c.applicant.name}　{c.applicant.phone}
              </dd>
            </div>
          </dl>
          <div className="gov-form-buttons">
            <button className="button secondary" onClick={() => window.print()}>
              列印收件證明
            </button>
            <Link className="button primary" href={`/cases/${id}`}>
              查詢案件進度
            </Link>
          </div>
        </section>
      )}
      <section className="case-status-banner">
        <span className="large-icon">
          {status === "ASSESSMENT_SCHEDULED" ? (
            <CalendarDays size={28} />
          ) : (
            <Clock3 size={28} />
          )}
        </span>
        <div>
          <span className="eyebrow">接下來的一步</span>
          <h2>
            {status === "DRAFT"
              ? "申請草稿尚未送出"
              : status === "NEEDS_MORE_INFORMATION"
                ? "案件待補正"
                : status === "ASSESSMENT_SCHEDULED"
                  ? "已安排到府評估"
                  : status === "RETURNED"
                    ? "請依退回原因修正申請"
                    : status === "SUBMITTED"
                      ? "申請已收件，待承辦人員聯繫"
                      : status === "CLOSED"
                        ? "案件已結案"
                        : "由專業人員接續處理"}
          </h2>
          <p>
            {status === "ASSESSMENT_SCHEDULED"
              ? `${dateTime(c.assessment.scheduledAt)}（臺北時間） · 請確認受訪時間與實際居住地址。`
              : status === "NEEDS_MORE_INFORMATION"
                ? "請補充下方指定內容，確認後送出；原申請紀錄會保留。"
                : "請留意案件進度及聯絡通知；如需補充資料，將於本頁列出。"}
          </p>
        </div>
        {status === "DRAFT" || status === "RETURNED" ? (
          <Link className="button primary" href={`/apply/${id}`}>
            繼續申請
            <ArrowRight size={16} />
          </Link>
        ) : (
          <a className="button secondary" href="#case-timeline">
            查看案件紀錄
            <ArrowRight size={16} />
          </a>
        )}
      </section>
      <div className="case-progress">
        {journey.map((s, i) => (
          <div
            key={s}
            className={i < progress ? "done" : i === progress ? "active" : ""}
          >
            <span>
              {i < progress ? (
                <CheckCircle2 size={20} />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
            <strong>{s}</strong>
          </div>
        ))}
      </div>
      {status === "NEEDS_MORE_INFORMATION" && (
        <section className="panel amendment-panel">
          <div className="panel-header">
            <h2>補充資料</h2>
            <span className="badge amber">需要你的確認</span>
          </div>
          {c.application.missingFields.map((m) => (
            <div className="amendment-reason" key={m.field}>
              <h3>{m.label}</h3>
              <p>{m.reason}</p>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              amend(true);
            }}
          >
            <label className="field" htmlFor="amendment-address">
              <span>出院後實際接受服務地址</span>
              <input
                id="amendment-address"
                name="recipient.currentAddress"
                data-agent-field="amendment-current-address"
                aria-label="補件地址"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setConfirm(false);
                }}
                placeholder="請填寫已確認的出院後地址"
                required
              />
              <small className="muted">
                原填寫：{c.recipient.currentAddress}
              </small>
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                aria-label="確認補件內容"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
              />
              <span>我已核對這次補充的地址，確認送出補件。</span>
            </label>
            <div className="actions-right">
              <button
                type="button"
                className="button secondary"
                onClick={() => amend(false)}
              >
                保存補件草稿
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={!confirm || !address.trim()}
                data-agent-action="submit-amendment"
              >
                確認並送出補件
                <ArrowRight size={17} />
              </button>
            </div>
          </form>
        </section>
      )}
      <div className="case-detail-grid">
        <section className="panel timeline-panel" id="case-timeline">
          <div className="panel-header">
            <h2>
              <Clock3 size={20} />
              案件時間軸
            </h2>
            <span className="small muted">
              {c.timelineEvents.length} 筆紀錄
            </span>
          </div>
          <ol className="timeline">
            {[...c.timelineEvents].reverse().map((event, i) => (
              <li key={event.id} className={i === 0 ? "latest" : ""}>
                <span className="timeline-dot" />
                <div>
                  <time>{dateTime(event.at)}</time>
                  <h3>{event.label}</h3>
                  {event.detail && <p>{event.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
        <div className="stack">
          <section className="panel case-information">
            <div className="panel-header">
              <h2>本次申請</h2>
              <FileText size={18} />
            </div>
            <dl>
              <div>
                <dt>聯絡人</dt>
                <dd>{c.applicant.name || "未填寫"}</dd>
              </div>
              <div>
                <dt>聯絡電話</dt>
                <dd>{c.applicant.phone || "未填寫"}</dd>
              </div>
              <div>
                <dt>
                  <MapPin size={14} />
                  服務地址
                </dt>
                <dd>{c.recipient.currentAddress || "未填寫"}</dd>
              </div>
              <div>
                <dt>家庭目標</dt>
                <dd>{c.careContext.goal || "尚未了解"}</dd>
              </div>
            </dl>
          </section>
          <section className="journey-note">
            <ShieldCheck size={21} />
            <h3>評估前，確認聯絡資訊。</h3>
            <p>
              請留意聯絡電話、實際居住地址及排程時間。正式資格與需要等級仍須由照管專員評估。
            </p>
          </section>
        </div>
      </div>
    </>
  );
}

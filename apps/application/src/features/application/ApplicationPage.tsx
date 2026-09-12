"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Printer, Save } from "lucide-react";
import { validateCase } from "../../services/sandbox";
import type { CasePatch, GovernmentIntake, SandboxCase } from "../../types";
import { Empty, Notice, PageHeading, errorText, useSandbox } from "../../ui";
import { fetchApi } from "../../lib/fetch-api";

const emptyIntake: GovernmentIntake = {
  sex: "",
  language: "",
  livingArrangement: "",
  hiredCaregiver: "",
  hospitalizedRecently: "",
  transfers: "",
  dressing: "",
  requestedServices: [],
  referralSource: "",
};
const serviceOptions = [
  "照顧服務",
  "專業服務／復能",
  "交通接送",
  "輔具服務",
  "居家無障礙環境改善",
  "喘息服務",
  "尚不確定，請協助評估",
];
const _uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const roleOptions: [string, string][] = [
  ["SELF", "本人申請"],
  ["FAMILY_PROXY", "家屬代為申請"],
  ["PROFESSIONAL_PROXY", "專業人員代為申請"],
  ["OTHER_PROXY", "其他代理人"],
];
const situationOptions: [string, string][] = [
  ["HOME", "居住家中"],
  ["HOSPITAL_DISCHARGE", "住院中／準備出院"],
  ["INSTITUTION", "居住機構"],
  ["OTHER", "其他"],
];
const careFields: [keyof SandboxCase["careContext"], string, boolean][] = [
  ["recentEvent", "疾病及近期身體狀況", true],
  ["mobility", "走動", true],
  ["bathing", "洗澡", true],
  ["eating", "吃飯", true],
  ["toileting", "如廁", false],
  ["primaryCaregiver", "主要照顧者", true],
  ["daytimeCaregiverAvailability", "白天照顧情形", true],
  ["goal", "申請原因及希望協助事項", true],
  ["caregiverBurden", "照顧者需協助事項", false],
  ["environmentRisks", "居家環境補充說明", false],
  ["currentServices", "目前使用的照顧服務或補助", false],
];
function Field({
  label,
  name,
  value,
  onChange,
  options,
  type = "text",
  required = false,
  error,
  hint,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options?: [string, string][];
  type?: string;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  const id = name.replaceAll(".", "-");
  const descriptions =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") ||
    undefined;
  const props = {
    id,
    name,
    "aria-label": label,
    "data-agent-field": id,
    value,
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => onChange(e.target.value),
    "aria-required": required,
    "aria-invalid": !!error,
    "aria-describedby": descriptions,
  };
  return (
    <div className={`gov-form-row ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>
        {required && (
          <span className="required" aria-hidden="true">
            ＊
          </span>
        )}
        {label}
      </label>
      <div className="gov-form-control">
        {options ? (
          <select {...props}>
            <option value="">請選擇</option>
            {options.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        ) : type === "textarea" ? (
          <textarea {...props} rows={3} />
        ) : (
          <input {...props} type={type} />
        )}
        {hint && <small id={`${id}-hint`}>{hint}</small>}
        {error && (
          <span className="field-error" id={`${id}-error`}>
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
function CheckRow({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="gov-check" htmlFor={id}>
      <input
        type="checkbox"
        id={id}
        name={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="gov-form-section">
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}
function Progress({ review = false }: { review?: boolean }) {
  return (
    <ol className="gov-application-progress" aria-label="線上申辦進度">
      {["填寫資料", "檢視資料", "收件完成"].map((s, i) => (
        <li
          key={s}
          className={
            (review ? 1 : 0) === i
              ? "current"
              : review && i === 0
                ? "complete"
                : ""
          }
          aria-current={(review ? 1 : 0) === i ? "step" : undefined}
        >
          <span>{review && i === 0 ? <Check size={20} /> : i + 1}</span>
          <strong>{s}</strong>
        </li>
      ))}
    </ol>
  );
}
export default function ApplicationPage() {
  const { id: rawId } = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  return <ApplicationForm key={id ?? "new"} id={id} />;
}

function ApplicationForm({ id }: { id?: string }) {
  const service = useSandbox();
  const router = useRouter();
  const search = useSearchParams();
  const item = id ? service.listCases().find((c) => c.id === id) : undefined;
  const [form, setForm] = useState<SandboxCase | undefined>(item);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [finalCheck, setFinalCheck] = useState(false);
  const [loadingIntake, setLoadingIntake] = useState(!!id && _uuidPattern.test(id) && !item);
  const [submitting, setSubmitting] = useState(false);
  const [permission, setPermission] = useState({
    privacyAccepted: item?.consent.privacyAccepted || false,
    proxyConfirmed: item?.consent.proxyConfirmed || false,
  });
  useEffect(() => {
    if (!id || item || !_uuidPattern.test(id)) return;
    const controller = new AbortController();
    fetchApi<{ intake: { id: string; data: CasePatch & { consent?: SandboxCase["consent"] } } }>(
      `/api/application-intakes/${id}`,
      { credentials: "include", cache: "no-store", signal: controller.signal },
    )
      .then(({ intake }) => {
        const loaded = service.createCase(intake.id, intake.data);
        setForm(loaded);
        setPermission({
          privacyAccepted: loaded.consent.privacyAccepted,
          proxyConfirmed: loaded.consent.proxyConfirmed,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("無法載入 Agent 已整理的申請資料，請確認登入狀態後重試。");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingIntake(false);
      });
    return () => controller.abort();
  }, [id, item, service]);
  function create() {
    try {
      router.push(`/apply/${service.createCase().id}`);
    } catch (e) {
      setError(errorText(e));
    }
  }
  if (!id)
    return (
      <div className="government-application">
        <PageHeading
          eyebrow=""
          title="長期照顧服務線上申請"
          description="請先閱讀申辦說明，並備妥申請資料。"
        />
        <section className="gov-instructions">
          <h2>申辦說明</h2>
          <dl className="gov-information-table">
            <div>
              <dt>申辦項目</dt>
              <dd>長期照顧服務需求申請</dd>
            </div>
            <div>
              <dt>申請方式</dt>
              <dd>
                本人、家屬或代理人可提出申請；由照顧管理單位聯繫並安排評估。
              </dd>
            </div>
            <div>
              <dt>準備資料</dt>
              <dd>
                需服務者基本資料、實際居住地址、聯絡人電話及生活協助需求。
              </dd>
            </div>
            <div>
              <dt>注意事項</dt>
              <dd>
                請確認申請人與需服務者的基本資料及聯絡方式正確；代理申請請先確認同意或代理權限。
              </dd>
            </div>
          </dl>
          <div className="gov-form-buttons">
            <button className="button primary" onClick={create}>
              建立申請草稿 <ArrowRight size={18} />
            </button>
            <Link className="button secondary" href="/cases">
              繼續既有申請
            </Link>
          </div>
          {service
            .listCases()
            .filter((c) => c.application.status === "DRAFT")
            .map((c) => (
              <Link className="gov-draft-link" key={c.id} href={`/apply/${c.id}`}>
                繼續草稿：{c.id}　{c.recipient.name || "尚未填寫姓名"}
              </Link>
            ))}
          {error && <Notice warning>{error}</Notice>}
        </section>
      </div>
    );
  if (!item || !form)
    return (
      <Empty title={loadingIntake ? "正在載入申請資料" : "找不到這份申請"}>
        <p>{loadingIntake ? "正在讀取 Agent 已整理的內容。" : error || "請確認案件編號，或返回申請頁重新建立。"}</p>
      </Empty>
    );
  if (!["DRAFT", "RETURNED"].includes(item.application.status))
    return (
      <Empty title="這份申請已經送出">
        <p>後續補件與評估安排請到案件進度查看。</p>
        <Link className="button primary" href={`/cases/${id}`}>
          查看案件進度
        </Link>
      </Empty>
    );
  const agreement =
    !item.consent.privacyAccepted || search.get("view") === "agreement";
  const review =
    !agreement &&
    item.draftStage === "READY_TO_SUBMIT" &&
    search.get("view") !== "form";
  const intake = { ...emptyIntake, ...form.intake };
  function change(
    section: string,
    key: string,
    value: string | boolean | string[],
  ) {
    setSaved(false);
    setFinalCheck(false);
    setForm((f) =>
      f
        ? section === "root"
          ? { ...f, [key]: value }
          : {
              ...f,
              [section]: {
                ...(f[section as keyof SandboxCase] as object),
                [key]: value,
              },
            }
        : f,
    );
  }
  function persist() {
    if (!form || !id) throw new Error("找不到申請");
    const patch: CasePatch = {
      jurisdiction: form.jurisdiction,
      applicantRole: form.applicantRole,
      currentSituation: form.currentSituation,
      applicant: form.applicant,
      recipient: form.recipient,
      careContext: form.careContext,
      intake: form.intake,
      precheck: form.precheck,
    };
    const updated = service.updateCase(id, patch, form.version);
    setForm(updated);
    return updated;
  }
  function go(view: string) {
    router.replace(`/apply/${id}?view=${view}`, { scroll: false });
    setError("");
    setErrors({});
    setFinalCheck(false);
    setSaved(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function consent() {
    try {
      if (!form!.applicantRole) throw new Error("請先選擇申請人身分。");
      if (
        !permission.privacyAccepted ||
        (form!.applicantRole !== "SELF" && !permission.proxyConfirmed)
      )
        throw new Error("請確認資料使用說明；代理申請也需要確認代理權限。");
      persist();
      setForm(service.grantConsent(id!, permission));
      go("form");
    } catch (e) {
      setError(errorText(e));
    }
  }
  function next() {
    try {
      setError("");
      const current = persist();
      const missing = validateCase(current);
      setErrors(missing);
      if (Object.keys(missing).length) {
        setError("資料尚未填寫完整，請依下列提示修正後再送出。");
        window.scrollTo({ top: 0, behavior: "instant" });
        return;
      }
      service.setDraftStage(id!, "READY_TO_REVIEW");
      setForm(service.setDraftStage(id!, "READY_TO_SUBMIT"));
      go("review");
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (!finalCheck) throw new Error("請先確認本次申請內容。");
      service.approveSubmission(id!, form?.dataRevision);
      await fetchApi<{ applicationPackageId: string }>(`/api/application-intakes/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true, data: form }),
      });
      service.submitCase(id!);
      router.push(`/cases/${id}?receipt=1`);
    } catch (e) {
      setError(e instanceof Error && e.message.includes("status 401")
        ? "登入已過期，請重新登入後再送出。"
        : "暫時無法送出申請，資料仍保留在草稿中，請稍後重試。");
    } finally {
      setSubmitting(false);
    }
  }
  const profile = (
    section: "applicant" | "recipient",
    key: string,
    label: string,
    required = true,
    type = "text",
    hint?: string,
  ) => (
    <Field
      label={label}
      name={`${section}.${key}`}
      value={String(
        (form[section] as unknown as Record<string, string>)[key] || "",
      )}
      onChange={(v) =>
        change(section, key, key === "nationalId" ? v.toUpperCase() : v)
      }
      required={required}
      type={type}
      hint={hint}
      error={errors[`${section}.${key}`]}
    />
  );
  const extra = (
    key: Exclude<keyof GovernmentIntake, "requestedServices">,
    label: string,
    options?: string[],
  ) => (
    <Field
      label={label}
      name={`intake.${key}`}
      value={intake[key]}
      onChange={(v) => change("intake", key, v)}
      options={options?.map((v) => [v, v])}
    />
  );
  const care = (key: keyof SandboxCase["careContext"]) => {
    const [, label, required] = careFields.find((f) => f[0] === key)!;
    return (
      <Field
        label={label}
        name={`careContext.${key}`}
        value={form.careContext[key]}
        required={required}
        onChange={(v) => change("careContext", key, v)}
        type={
          ["recentEvent", "goal", "environmentRisks"].includes(key)
            ? "textarea"
            : "text"
        }
        error={errors[`careContext.${key}`]}
      />
    );
  };
  const reviewSections: { title: string; rows: [string, string][] }[] = [
    {
      title: "一、申請及聯絡人資料",
      rows: [
        [
          "申請人身分",
          roleOptions.find(([v]) => v === form.applicantRole)?.[1] || "",
        ],
        ["姓名", form.applicant.name],
        ["身分證字號／居留證號", form.applicant.nationalId],
        ["聯絡電話", form.applicant.phone],
        ["電子郵件", form.applicant.email],
        [
          "與需服務者關係",
          form.applicant.relationship ||
            (form.applicantRole === "SELF" ? "本人" : ""),
        ],
      ],
    },
    {
      title: "二、需服務者基本資料",
      rows: [
        ["姓名", form.recipient.name],
        ["身分證字號／居留證號", form.recipient.nationalId],
        ["性別", intake.sex],
        ["出生日期", form.recipient.birthDate],
        ["常用語言", intake.language],
        ["服務縣市", form.jurisdiction],
        ["居住地址", form.recipient.currentAddress],
        ["戶籍地址", form.recipient.registeredAddress],
      ],
    },
    {
      title: "三、生活及照顧情形",
      rows: [
        [
          "目前居住情形",
          situationOptions.find(([v]) => v === form.currentSituation)?.[1] ||
            "",
        ],
        ["同住情形", intake.livingArrangement],
        ["聘僱看護情形", intake.hiredCaregiver],
        ["近三個月住院", intake.hospitalizedRecently],
        [
          "自述身分",
          [
            [form.precheck.disability, "身心障礙證明"],
            [form.precheck.dementia, "失智相關診斷"],
            [form.precheck.indigenous, "原住民"],
            [form.precheck.pac, "PAC收案對象"],
          ]
            .filter(([v]) => v)
            .map(([, s]) => s)
            .join("、") || "未勾選，待評估確認",
        ],
        ...careFields.map(
          ([k, label]) => [label, form.careContext[k]] as [string, string],
        ),
        ["上下床／移位", intake.transfers],
        ["穿衣", intake.dressing],
      ],
    },
    {
      title: "四、申請服務及其他事項",
      rows: [
        ["希望申請的服務", intake.requestedServices.join("、")],
        ["得知服務的管道", intake.referralSource],
        ["初步管道提示", form.precheck.notes],
      ],
    },
  ];
  return (
    <div className="government-application">
      <PageHeading
        eyebrow=""
        title="長期照顧服務線上申請"
        description="請依序填寫申請資料，確認內容後送出。"
      />
      {!agreement && <Progress review={review} />}
      <div className="gov-form-meta">
        <span>申辦項目：長期照顧服務</span>
        <span>草稿編號：{id}</span>
      </div>
      {item.application.status === "RETURNED" && (
        <Notice warning>
          案件退回修正：
          {
            [...item.timelineEvents]
              .reverse()
              .find((e) => e.type === "APPLICATION_RETURNED")?.detail
          }
          。請修正後重新檢閱送出。
        </Notice>
      )}
      {error && (
        <div className="gov-error-summary" role="alert">
          <strong>{error}</strong>
          {Object.keys(errors).length > 0 && (
            <ul>
              {Object.entries(errors).map(([key, text]) => (
                <li key={key}>
                  <a href={`#${key.replaceAll(".", "-")}`}>{text}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {saved && <Notice>草稿已儲存，可稍後返回繼續填寫。</Notice>}
      {agreement ? (
        <form
          className="gov-agreement"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            consent();
          }}
        >
          <h2>線上申辦同意書</h2>
          <p>使用本線上申辦服務前，請先閱讀以下說明：</p>
          <ol>
            <li>
              申請資料將用於長期照顧服務需求登錄、聯繫、補件與評估安排，請確認所填內容正確。
            </li>
            <li>請提供可聯繫的電話及實際居住地址，以便後續確認服務需求。</li>
            <li>填寫完成後，請於「檢視資料」頁核對內容，確認後再送出申請。</li>
            <li>
              收件表示已收到申請資料；服務資格與項目仍須經專業人員評估確認。
            </li>
            <li>代理申請時，請先取得需服務者同意，或確認具有適當代理權限。</li>
          </ol>
          <Field
            name="applicantRole"
            label="申請人身分"
            value={form.applicantRole}
            onChange={(v) => change("root", "applicantRole", v)}
            options={roleOptions}
            required
          />
          <CheckRow
            id="privacy-consent"
            checked={permission.privacyAccepted}
            onChange={(v) =>
              setPermission((p) => ({ ...p, privacyAccepted: v }))
            }
          >
            我已閱讀並同意上述申辦與資料使用說明。
          </CheckRow>
          {form.applicantRole !== "SELF" && (
            <CheckRow
              id="proxy-consent"
              checked={permission.proxyConfirmed}
              onChange={(v) =>
                setPermission((p) => ({ ...p, proxyConfirmed: v }))
              }
            >
              我確認已取得需服務者同意，或具適當代理權限。
            </CheckRow>
          )}
          <div className="gov-form-buttons">
            <Link className="button secondary" href="/">
              不同意，返回首頁
            </Link>
            <button className="button primary" type="submit">
              同意並開始填寫 <ArrowRight size={17} />
            </button>
          </div>
        </form>
      ) : review ? (
        <form
          className="gov-review"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="gov-review-heading">
            <h2>檢視申請資料</h2>
            <button
              type="button"
              className="text-link"
              onClick={() => window.print()}
            >
              <Printer size={18} /> 列印申請資料
            </button>
          </div>
          <p>
            請確認下列內容。需要修正時，請按「返回修改資料」。資料版本：第{" "}
            {form.dataRevision} 版。
          </p>
          {reviewSections.map((section) => (
            <section key={section.title} className="gov-review-section">
              <h3>{section.title}</h3>
              <dl className="gov-information-table">
                {section.rows.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value || "未填寫／待確認"}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          <div className="gov-submit-consent">
            <CheckRow
              id="final-confirmation"
              checked={finalCheck}
              onChange={setFinalCheck}
            >
              我已檢閱本次資料，確認送出這筆長照服務需求。
            </CheckRow>
            <p>修改資料後，須重新檢閱並確認送出。</p>
          </div>
          <div className="gov-form-buttons">
            <button
              className="button secondary"
              type="button"
              onClick={() => go("form")}
            >
              <ArrowLeft size={17} /> 返回修改資料
            </button>
            <button
              className="button primary"
              type="submit"
              disabled={!finalCheck || submitting}
              data-agent-action="submit-application"
            >
              {submitting ? "正在送出…" : "確認並送出申請"} <ArrowRight size={17} />
            </button>
          </div>
        </form>
      ) : (
        <form
          className="gov-long-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          <div className="gov-form-notes">
            <p>
              <span className="required">＊</span>{" "}
              為必填欄位。未了解的選填項目可留白，後續由專業人員確認。
            </p>
          </div>
          <Section title="一、申請及聯絡人資料">
            <div className="gov-static-row">
              <span>申請人身分</span>
              <strong>
                {roleOptions.find(([v]) => v === form.applicantRole)?.[1]}
              </strong>
            </div>
            {profile("applicant", "name", "申請人姓名")}
            {profile(
              "applicant",
              "nationalId",
              "申請人身分證字號／居留證號",
              true,
              "text",
              "請填寫身分證字號或居留證號。",
            )}{" "}
            {profile("applicant", "phone", "聯絡電話", true, "tel")}
            {profile("applicant", "email", "電子郵件", false, "email")}
            {profile(
              "applicant",
              "relationship",
              "與需服務者關係",
              form.applicantRole !== "SELF",
            )}
          </Section>
          <Section title="二、需服務者基本資料">
            {profile("recipient", "name", "需服務者姓名")}
            {profile(
              "recipient",
              "nationalId",
              "需服務者身分證字號／居留證號",
              true,
              "text",
              "請填寫需服務者的身分證字號或居留證號。",
            )}{" "}
            {extra("sex", "性別", ["男", "女", "其他／未提供"])}
            {profile(
              "recipient",
              "birthDate",
              "出生日期",
              true,
              "date",
              "請輸入西元出生日期。",
            )}{" "}
            {extra("language", "常用語言", [
              "國語",
              "臺語",
              "客語",
              "原住民族語",
              "其他",
            ])}
            <Field
              name="jurisdiction"
              label="預計接受服務的縣市"
              value={form.jurisdiction}
              onChange={(v) => change("root", "jurisdiction", v)}
              options={["新北市", "臺北市", "桃園市", "其他縣市"].map((v) => [
                v,
                v,
              ])}
              required
              error={errors.jurisdiction}
              hint="請依實際接受服務的地點選擇縣市。"
            />
            {profile(
              "recipient",
              "currentAddress",
              "實際接受服務地址",
              true,
              "text",
              "請填寫縣市、行政區、路段、門牌及樓層。",
            )}{" "}
            {profile("recipient", "registeredAddress", "戶籍地址", false)}
            <div className="gov-inline-action">
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  change(
                    "recipient",
                    "registeredAddress",
                    form.recipient.currentAddress,
                  )
                }
              >
                戶籍地址同居住地址
              </button>
            </div>
          </Section>
          <Section title="三、生活及照顧情形">
            <Field
              name="currentSituation"
              label="目前居住情形"
              value={form.currentSituation}
              onChange={(v) => change("root", "currentSituation", v)}
              options={situationOptions}
              required
              error={errors.currentSituation}
            />
            {extra("livingArrangement", "同住情形", [
              "獨居",
              "與家人同住",
              "與其他人同住",
              "尚待確認",
            ])}
            {extra("hiredCaregiver", "聘僱看護情形", [
              "未聘僱",
              "聘有本國籍看護",
              "聘有外籍看護",
              "尚待確認",
            ])}
            {extra("hospitalizedRecently", "近三個月是否住院", [
              "有",
              "無",
              "尚待確認",
            ])}
            <div className="gov-form-row">
              <span className="gov-row-label">身分及相關情形</span>
              <div className="gov-form-control">
                {(
                  [
                    ["disability", "領有身心障礙證明，且有生活協助需求"],
                    ["dementia", "已有失智相關診斷，且有生活協助需求"],
                    ["indigenous", "具原住民身分"],
                    ["pac", "急性後期整合照護（PAC）收案對象"],
                  ] as const
                ).map(([key, label]) => (
                  <CheckRow
                    key={key}
                    id={`precheck-${key}`}
                    checked={form.precheck[key]}
                    onChange={(v) => change("precheck", key, v)}
                  >
                    {label}
                  </CheckRow>
                ))}
                <small>
                  僅記錄自述情形；不確定可不勾選，並於補充說明記錄。
                </small>
              </div>
            </div>
            {care("recentEvent")}
            {care("primaryCaregiver")}
            {care("daytimeCaregiverAvailability")}
            {care("currentServices")}
          </Section>
          <Section title="四、日常活動需協助情形">
            <p className="gov-section-description">
              請依目前生活情況填寫，例如「可自行完成」、「需要部分協助」、「需完全協助」或具體說明。
            </p>
            {care("eating")}
            {extra("transfers", "上下床／移位")}
            {care("mobility")}
            {extra("dressing", "穿衣")}
            {care("bathing")}
            {care("toileting")}
          </Section>
          <Section title="五、申請服務及補充說明">
            <div className="gov-form-row">
              <span className="gov-row-label">
                希望申請的服務
                <br />
                <small>（可複選）</small>
              </span>
              <div className="gov-form-control gov-service-options">
                {serviceOptions.map((s, i) => (
                  <CheckRow
                    key={s}
                    id={`requested-service-${i}`}
                    checked={intake.requestedServices.includes(s)}
                    onChange={(v) =>
                      change(
                        "intake",
                        "requestedServices",
                        v
                          ? [...intake.requestedServices, s]
                          : intake.requestedServices.filter((x) => x !== s),
                      )
                    }
                  >
                    {s}
                  </CheckRow>
                ))}
                <small>勾選代表提出需求，服務內容仍須評估後確認。</small>
              </div>
            </div>
            {care("goal")}
            {care("caregiverBurden")}
            {care("environmentRisks")}
            {extra("referralSource", "得知服務的管道", [
              "親友",
              "醫療院所",
              "政府機關",
              "網路資訊",
              "其他",
            ])}
          </Section>
          <div className="gov-form-buttons">
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                try {
                  persist();
                  go("agreement");
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            >
              <ArrowLeft size={17} /> 返回同意書
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                try {
                  persist();
                  setSaved(true);
                  setError("");
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            >
              <Save size={17} /> 儲存草稿
            </button>
            <button
              type="submit"
              className="button primary"
              data-agent-action="continue"
            >
              下一步：檢視資料 <ArrowRight size={17} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

import type {
  CasePatch,
  CaseState,
  CaseStatus,
  DraftStage,
  GovernmentCommand,
  GovernmentPayload,
  SandboxCase,
} from "../types.ts";
import { browserStorage, createMemoryStorage } from "./storage.ts";
import type { SandboxStorage } from "./storage.ts";

export type { SandboxStorage } from "./storage.ts";
export const SANDBOX_STORAGE_KEY = "ltc-applications.cases.v1";

export const statusLabels: Record<CaseStatus, string> = {
  DRAFT: "申請草稿",
  SUBMITTED: "已送出・等候受理",
  NEEDS_MORE_INFORMATION: "待補充資料",
  ASSESSMENT_SCHEDULED: "已安排到府評估",
  ASSESSMENT_COMPLETED: "到府評估已完成",
  PROFESSIONAL_REVIEW: "專業人員檢視中",
  SERVICE_COORDINATION: "服務協調中",
  ACTIVE: "服務進行中",
  CLOSED: "案件已結束",
  RETURNED: "退回修正",
};
export const commandLabels: Record<GovernmentCommand, string> = {
  CASE_ACCEPTED: "確認收件",
  REQUEST_MORE_INFORMATION: "要求補充資料",
  SCHEDULE_ASSESSMENT: "安排到府評估",
  COMPLETE_ASSESSMENT: "完成到府評估",
  REQUIRE_PROFESSIONAL_REVIEW: "送交專業檢視",
  COORDINATE_SERVICES: "開始服務協調",
  ACTIVATE_SERVICES: "啟用服務",
  CLOSE_CASE: "結束案件",
  RETURN_APPLICATION: "退回修正",
};

const governmentTransitions: Record<
  CaseStatus,
  Partial<Record<GovernmentCommand, CaseStatus>>
> = {
  DRAFT: {},
  SUBMITTED: {
    CASE_ACCEPTED: "SUBMITTED",
    REQUEST_MORE_INFORMATION: "NEEDS_MORE_INFORMATION",
    SCHEDULE_ASSESSMENT: "ASSESSMENT_SCHEDULED",
    RETURN_APPLICATION: "RETURNED",
  },
  NEEDS_MORE_INFORMATION: { RETURN_APPLICATION: "RETURNED" },
  ASSESSMENT_SCHEDULED: {
    COMPLETE_ASSESSMENT: "ASSESSMENT_COMPLETED",
    RETURN_APPLICATION: "RETURNED",
  },
  ASSESSMENT_COMPLETED: { REQUIRE_PROFESSIONAL_REVIEW: "PROFESSIONAL_REVIEW" },
  PROFESSIONAL_REVIEW: {
    COORDINATE_SERVICES: "SERVICE_COORDINATION",
    RETURN_APPLICATION: "RETURNED",
  },
  SERVICE_COORDINATION: { ACTIVATE_SERVICES: "ACTIVE" },
  ACTIVE: { CLOSE_CASE: "CLOSED" },
  CLOSED: {},
  RETURNED: {},
};

export function getAllowedGovernmentCommands(
  c: SandboxCase,
): GovernmentCommand[] {
  return (
    Object.keys(
      governmentTransitions[c.application.status],
    ) as GovernmentCommand[]
  ).filter(
    (command) =>
      command !== "CASE_ACCEPTED" ||
      !c.timelineEvents.some((event) => event.type === "CASE_ACCEPTED"),
  );
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10)
  );
}

export function validateCase(c: SandboxCase): Record<string, string> {
  const errors: Record<string, string> = {};
  const required: [string, string, string][] = [
    ["jurisdiction", c.jurisdiction, "請選擇服務縣市"],
    ["applicantRole", c.applicantRole, "請選擇申請人身分"],
    ["currentSituation", c.currentSituation, "請選擇目前居住情境"],
    ["applicant.name", c.applicant.name, "請填寫申請人姓名"],
    [
      "applicant.nationalId",
      c.applicant.nationalId,
      "請填寫身分證字號或居留證號",
    ],
    ["applicant.phone", c.applicant.phone, "請填寫聯絡電話"],
    ["recipient.name", c.recipient.name, "請填寫被照顧者姓名"],
    [
      "recipient.nationalId",
      c.recipient.nationalId,
      "請填寫需服務者的身分證字號或居留證號",
    ],
    ["recipient.birthDate", c.recipient.birthDate, "請填寫出生日期"],
    [
      "recipient.currentAddress",
      c.recipient.currentAddress,
      "請填寫目前實際居住地址",
    ],
    [
      "careContext.recentEvent",
      c.careContext.recentEvent,
      "請說明近期發生的事情",
    ],
    ["careContext.mobility", c.careContext.mobility, "請填寫行動協助需求"],
    ["careContext.bathing", c.careContext.bathing, "請填寫沐浴協助需求"],
    ["careContext.eating", c.careContext.eating, "請填寫進食協助需求"],
    [
      "careContext.daytimeCaregiverAvailability",
      c.careContext.daytimeCaregiverAvailability,
      "請填寫白天照顧人力",
    ],
    [
      "careContext.primaryCaregiver",
      c.careContext.primaryCaregiver,
      "請填寫主要照顧安排，沒有照顧者也可直接說明",
    ],
    ["careContext.goal", c.careContext.goal, "請填寫目前最希望改善的事情"],
  ];
  for (const [field, value, message] of required)
    if (!value.trim()) errors[field] = message;
  if (
    c.applicantRole &&
    !["SELF", "FAMILY_PROXY", "PROFESSIONAL_PROXY", "OTHER_PROXY"].includes(
      c.applicantRole,
    )
  )
    errors.applicantRole = "請選擇有效的申請人身分";
  if (
    c.currentSituation &&
    !["HOME", "HOSPITAL_DISCHARGE", "INSTITUTION", "OTHER"].includes(
      c.currentSituation,
    )
  )
    errors.currentSituation = "請選擇有效的居住情境";
  if (
    c.applicant.phone &&
    !/^0\d{8,9}$/.test(c.applicant.phone.replace(/[\s()-]/g, ""))
  )
    errors["applicant.phone"] = "請填寫 9 至 10 碼聯絡電話";
  for (const key of ["applicant", "recipient"] as const)
    if (
      c[key].nationalId &&
      !/^[A-Z](?:[0-9]{9}|[A-Z][0-9]{8})$/.test(c[key].nationalId.toUpperCase())
    )
      errors[`${key}.nationalId`] =
        "請確認身分證字號或居留證號格式（10 碼英數字）";
  if (
    c.applicant.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.applicant.email)
  )
    errors["applicant.email"] = "請確認電子郵件格式";
  if (c.recipient.birthDate && !validDate(c.recipient.birthDate))
    errors["recipient.birthDate"] = "請填寫有效且不晚於今天的出生日期";
  if (c.applicantRole !== "SELF" && !c.applicant.relationship.trim())
    errors["applicant.relationship"] = "請說明與被照顧者的關係";
  if (!c.consent.privacyAccepted)
    errors["consent.privacyAccepted"] = "請閱讀並同意本次申辦的資料使用說明";
  if (c.applicantRole !== "SELF" && !c.consent.proxyConfirmed)
    errors["consent.proxyConfirmed"] =
      "代理申請需要確認已取得同意或具有適當代理權限";
  return errors;
}

interface Store {
  schemaVersion: 1;
  sequence: number;
  cases: SandboxCase[];
  requests: Record<string, { caseId: string; revision: number }>;
}
const emptyStore = (): Store => ({
  schemaVersion: 1,
  sequence: 0,
  cases: [],
  requests: {},
});
const clone = <T>(value: T): T => structuredClone(value);
const now = () => new Date().toISOString();

function addEvent(c: SandboxCase, type: string, label: string, detail = "") {
  c.timelineEvents.push({
    id: `${c.id}-event-${c.timelineEvents.length + 1}`,
    type,
    label,
    detail,
    at: now(),
  });
}
function invalidateApproval(c: SandboxCase) {
  c.consent.finalSubmissionApproved = false;
  c.consent.approvedRevision = null;
  if (c.draftStage === "READY_TO_SUBMIT") c.draftStage = "READY_TO_REVIEW";
}
function assertEditable(c: SandboxCase) {
  if (!["DRAFT", "RETURNED"].includes(c.application.status))
    throw new Error(
      "這個案件已送出。請依案件狀態處理補件，不能直接覆寫原申請。",
    );
}
function assertComplete(c: SandboxCase) {
  const errors = validateCase(c);
  if (Object.keys(errors).length)
    throw new Error(`尚未完成申請：${Object.values(errors).join("；")}`);
}
function updatePrecheck(c: SandboxCase) {
  const date = c.recipient.birthDate;
  if (!validDate(date)) {
    c.precheck.status = "NOT_CHECKED";
    c.precheck.notes = "請先填寫有效出生日期。正式資格仍須由專業人員評估。";
    return;
  }
  const current = new Date();
  let age = current.getFullYear() - Number(date.slice(0, 4));
  if (
    `${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}` <
    date.slice(5)
  )
    age--;
  const possible =
    age >= 65 ||
    (age >= 55 && c.precheck.indigenous) ||
    c.precheck.disability ||
    c.precheck.dementia ||
    c.precheck.pac;
  c.precheck.status = possible ? "POTENTIALLY_ELIGIBLE" : "REQUIRES_REVIEW";
  c.precheck.notes = possible
    ? "可繼續提出服務需求；此為初步流程檢查，正式資格、照顧需要程度與服務仍須由專業人員評估。"
    : "目前資料需由專業人員進一步確認。仍可提出需求，本系統不會據此拒絕申請或判定資格。";
}

export function createSandboxService(
  storage: SandboxStorage = typeof window === "undefined"
    ? createMemoryStorage()
    : browserStorage,
) {
  const listeners = new Set<() => void>();
  let snapshot = 0;
  const notify = () => {
    snapshot++;
    listeners.forEach((listener) => listener());
  };

  function read(): Store {
    let raw: string | null;
    try {
      raw = storage.getItem(SANDBOX_STORAGE_KEY);
    } catch {
      throw new Error(
        "無法讀取瀏覽器儲存空間。請允許此網站使用本機儲存，或改用一般瀏覽視窗；尚未變更案件資料。",
      );
    }
    if (raw === null) return emptyStore();
    try {
      const value: Store = JSON.parse(raw);
      if (
        value.schemaVersion !== 1 ||
        !Number.isSafeInteger(value.sequence) ||
        !Array.isArray(value.cases) ||
        !value.requests ||
        typeof value.requests !== "object"
      )
        throw new Error();
      for (const c of value.cases) {
        if (
          c.schemaVersion !== 1 ||
          typeof c.id !== "string" ||
          !Number.isInteger(c.version) ||
          !Number.isInteger(c.dataRevision) ||
          !c.application ||
          !(c.application.status in statusLabels) ||
          !Array.isArray(c.application.missingFields) ||
          !Array.isArray(c.timelineEvents) ||
          !c.applicant ||
          !c.recipient ||
          !c.careContext ||
          !c.consent ||
          !c.precheck ||
          !c.assessment
        )
          throw new Error();
      }
      return value;
    } catch {
      throw new Error(
        "已儲存的案件資料格式不相容或已損毀。原始資料仍保留；請聯繫系統管理人員協助處理。",
      );
    }
  }
  function write(store: Store) {
    try {
      storage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(store));
    } catch {
      throw new Error(
        "本次變更未儲存：瀏覽器儲存空間不足或權限受限。原案件仍保留，請排除問題後重試。",
      );
    }
    notify();
  }
  function find(store: Store, id: string): SandboxCase {
    const c = store.cases.find((item) => item.id === id);
    if (!c) throw new Error("找不到這個案件。請確認案件編號或返回案件查詢。");
    return c;
  }
  function change(
    id: string,
    action: (c: SandboxCase, store: Store) => void,
    expectedVersion?: number,
  ): SandboxCase {
    const store = read();
    const c = find(store, id);
    if (expectedVersion !== undefined && expectedVersion !== c.version)
      throw new Error(
        "案件已有較新的變更。請重新讀取最新資料，再確認這次修改。",
      );
    const before = JSON.stringify(c);
    action(c, store);
    if (JSON.stringify(c) === before) return clone(c);
    c.version++;
    c.updatedAt = now();
    write(store);
    return clone(c);
  }

  const service = {
    listCases(): SandboxCase[] {
      return clone(read().cases).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
    },
    getCase(id: string): SandboxCase {
      return clone(find(read(), id));
    },
    createCase(
      id?: string,
      data: CasePatch & {
        consent?: Partial<Pick<SandboxCase["consent"], "privacyAccepted" | "proxyConfirmed">>;
      } = {},
    ): SandboxCase {
      const store = read();
      const existing = id ? store.cases.find((item) => item.id === id) : undefined;
      if (existing) return clone(existing);
      const at = now();
      if (!id) store.sequence++;
      const c: SandboxCase = {
        schemaVersion: 1,
        id: id ?? `LTC-${new Date().getFullYear()}-${String(store.sequence).padStart(4, "0")}`,
        version: 1,
        dataRevision: 0,
        jurisdiction: data.jurisdiction ?? "",
        applicantRole: data.applicantRole ?? "",
        currentSituation: data.currentSituation ?? "",
        applicant: {
          name: "",
          nationalId: "",
          phone: "",
          email: "",
          relationship: "",
          ...data.applicant,
        },
        recipient: {
          name: "",
          nationalId: "",
          birthDate: "",
          currentAddress: "",
          registeredAddress: "",
          ...data.recipient,
        },
        careContext: {
          recentEvent: "",
          mobility: "",
          bathing: "",
          eating: "",
          toileting: "",
          daytimeCaregiverAvailability: "",
          primaryCaregiver: "",
          caregiverBurden: "",
          environmentRisks: "",
          currentServices: "",
          goal: "",
          ...data.careContext,
        },
        intake: {
          sex: "",
          language: "",
          livingArrangement: "",
          hiredCaregiver: "",
          hospitalizedRecently: "",
          transfers: "",
          dressing: "",
          requestedServices: [],
          referralSource: "",
          ...data.intake,
        },
        consent: {
          privacyAccepted: data.consent?.privacyAccepted ?? false,
          proxyConfirmed: data.consent?.proxyConfirmed ?? false,
          finalSubmissionApproved: false,
          approvedRevision: null,
        },
        precheck: {
          status: "NOT_CHECKED",
          notes: "尚未完成初步流程檢查。",
          disability: false,
          dementia: false,
          indigenous: false,
          pac: false,
          ...data.precheck,
        },
        draftStage: "DRAFT",
        application: {
          status: "DRAFT",
          submittedAt: null,
          missingFields: [],
          amendment: {},
        },
        assessment: { scheduledAt: null, summary: "" },
        timelineEvents: [],
        createdAt: at,
        updatedAt: at,
      };
      addEvent(c, "DRAFT_CREATED", id ? "載入 Agent 已整理的申請草稿" : "建立申請草稿");
      store.cases.push(c);
      write(store);
      return clone(c);
    },
    updateCase(
      id: string,
      patch: CasePatch,
      expectedVersion?: number,
    ): SandboxCase {
      return change(
        id,
        (c) => {
          assertEditable(c);
          const before = JSON.stringify(c);
          for (const key of [
            "jurisdiction",
            "applicantRole",
            "currentSituation",
          ] as const)
            if (patch[key] !== undefined) c[key] = patch[key];
          for (const key of ["applicant", "recipient", "careContext"] as const)
            if (patch[key]) Object.assign(c[key], patch[key]);
          if (patch.intake) {
            c.intake = Object.assign(
              {
                sex: "",
                language: "",
                livingArrangement: "",
                hiredCaregiver: "",
                hospitalizedRecently: "",
                transfers: "",
                dressing: "",
                requestedServices: [] as string[],
                referralSource: "",
              },
              c.intake,
              clone(patch.intake),
            );
          }
          if (patch.precheck)
            for (const key of [
              "disability",
              "dementia",
              "indigenous",
              "pac",
            ] as const)
              if (patch.precheck[key] !== undefined)
                c.precheck[key] = patch.precheck[key];
          if (JSON.stringify(c) !== before) {
            c.dataRevision++;
            invalidateApproval(c);
            updatePrecheck(c);
          }
        },
        expectedVersion,
      );
    },
    setDraftStage(id: string, stage: DraftStage): SandboxCase {
      return change(id, (c) => {
        assertEditable(c);
        if (
          stage !== "DRAFT" &&
          (!c.jurisdiction || !c.applicantRole || !c.currentSituation)
        )
          throw new Error("請先完成申請身分、目前情境與服務縣市。");
        if (["PRECHECK_COMPLETE", "WAITING_CONSENT"].includes(stage)) {
          if (!validDate(c.recipient.birthDate))
            throw new Error("請先填寫有效的出生日期，再進行初步流程檢查。");
          updatePrecheck(c);
        }
        if (
          ["PROFILE_INCOMPLETE", "READY_TO_REVIEW", "READY_TO_SUBMIT"].includes(
            stage,
          ) &&
          (!c.consent.privacyAccepted ||
            (c.applicantRole !== "SELF" && !c.consent.proxyConfirmed))
        )
          throw new Error("請先由申請人確認資料使用與代理申請權限。");
        if (stage === "READY_TO_REVIEW" || stage === "READY_TO_SUBMIT")
          assertComplete(c);
        c.draftStage = stage;
      });
    },
    grantConsent(
      id: string,
      consent: { privacyAccepted: boolean; proxyConfirmed: boolean },
    ): SandboxCase {
      return change(id, (c) => {
        assertEditable(c);
        if (
          !consent.privacyAccepted ||
          (c.applicantRole !== "SELF" && !consent.proxyConfirmed)
        )
          throw new Error("請確認資料使用說明；代理申請也需要適當代理權限。");
        if (
          c.consent.privacyAccepted === consent.privacyAccepted &&
          c.consent.proxyConfirmed === consent.proxyConfirmed
        )
          return;
        c.consent.privacyAccepted = consent.privacyAccepted;
        c.consent.proxyConfirmed = consent.proxyConfirmed;
        c.dataRevision++;
        invalidateApproval(c);
        c.draftStage = "PROFILE_INCOMPLETE";
        addEvent(
          c,
          "CONSENT_GRANTED",
          "申請人確認資料使用與代理權限",
          "已記錄本次資料使用及代理申請確認。",
        );
      });
    },
    approveSubmission(id: string, expectedDataRevision?: number): SandboxCase {
      return change(id, (c) => {
        assertEditable(c);
        assertComplete(c);
        if (
          expectedDataRevision !== undefined &&
          expectedDataRevision !== c.dataRevision
        )
          throw new Error("申請內容已更新，請重新檢閱最新資料後再確認。");
        if (c.draftStage !== "READY_TO_SUBMIT")
          throw new Error(
            "請先完成資料檢閱，前往最終確認頁，再由申請人確認送出。",
          );
        if (
          c.consent.finalSubmissionApproved &&
          c.consent.approvedRevision === c.dataRevision
        )
          return;
        c.consent.finalSubmissionApproved = true;
        c.consent.approvedRevision = c.dataRevision;
        c.draftStage = "READY_TO_SUBMIT";
        addEvent(
          c,
          "SUBMISSION_APPROVED",
          "申請人完成最終送出確認",
          `已確認資料版本 ${c.dataRevision}。`,
        );
      });
    },
    submitCase(id: string, requestId?: string): SandboxCase {
      return change(id, (c, store) => {
        const approvalEvent = [...c.timelineEvents]
          .reverse()
          .find((event) => event.type === "SUBMISSION_APPROVED");
        const key =
          requestId ??
          `${id}:submission:${c.dataRevision}:${approvalEvent?.id ?? "unapproved"}`;
        const previous = Object.hasOwn(store.requests, key)
          ? store.requests[key]
          : undefined;
        if (previous) {
          if (previous.caseId !== id)
            throw new Error(
              "這個送出識別碼已用於另一個案件，請使用新的識別碼。",
            );
          if (previous.revision !== c.dataRevision)
            throw new Error(
              "這個送出識別碼對應舊資料版本，請重新確認並使用新的識別碼。",
            );
          return;
        }
        if (
          c.application.submittedAt &&
          !["DRAFT", "RETURNED"].includes(c.application.status)
        )
          return;
        assertEditable(c);
        assertComplete(c);
        if (
          !c.consent.finalSubmissionApproved ||
          c.consent.approvedRevision !== c.dataRevision ||
          c.draftStage !== "READY_TO_SUBMIT"
        )
          throw new Error("尚未取得目前資料版本的最終確認，案件尚未送出。");
        const returned = c.application.status === "RETURNED";
        c.application.status = "SUBMITTED";
        c.application.submittedAt = now();
        c.application.missingFields = [];
        c.application.amendment = {};
        c.assessment = { scheduledAt: null, summary: "" };
        store.requests[key] = { caseId: id, revision: c.dataRevision };
        addEvent(
          c,
          returned ? "APPLICATION_RESUBMITTED" : "APPLICATION_SUBMITTED",
          returned ? "已修正並重新送出申請" : "已送出長照服務需求",
          "申請資料已收件，待後續聯繫及評估安排。",
        );
      });
    },
    provideMissingInformation(
      id: string,
      values: Record<string, string>,
    ): SandboxCase {
      return change(id, (c) => {
        if (c.application.status !== "NEEDS_MORE_INFORMATION")
          throw new Error("這個案件目前沒有待處理的補件要求。");
        for (const [field, value] of Object.entries(values)) {
          if (!c.application.missingFields.some((item) => item.field === field))
            throw new Error("只能補充本次要求的資料欄位。");
          if (field !== "recipient.currentAddress")
            throw new Error("請依通知補充實際居住地址。");
          c.application.amendment[field] = value;
        }
      });
    },
    submitAmendment(id: string): SandboxCase {
      return change(id, (c) => {
        if (c.application.status !== "NEEDS_MORE_INFORMATION")
          throw new Error("這個案件目前不需要送出補件。");
        const changes: string[] = [];
        for (const item of c.application.missingFields) {
          const value = c.application.amendment[item.field]?.trim();
          if (!value) throw new Error(`尚未完成補件：${item.label}`);
          if (item.field !== "recipient.currentAddress")
            throw new Error("請依通知補充實際居住地址。");
          changes.push(
            `${item.label}：${c.recipient.currentAddress} → ${value}`,
          );
          c.recipient.currentAddress = value;
        }
        c.dataRevision++;
        invalidateApproval(c);
        addEvent(
          c,
          "AMENDMENT_SUBMITTED",
          "已送出補充資料",
          changes.join("；"),
        );
        c.application.status = "SUBMITTED";
        c.application.missingFields = [];
        c.application.amendment = {};
      });
    },
    simulateGovernmentEvent(
      id: string,
      command: GovernmentCommand,
      payload: GovernmentPayload = {},
    ): SandboxCase {
      return change(id, (c) => {
        if (!getAllowedGovernmentCommands(c).includes(command))
          throw new Error(
            `目前「${statusLabels[c.application.status]}」不能執行「${commandLabels[command] ?? command}」。`,
          );
        let detail = payload.reason?.trim() ?? "";
        if (command === "REQUEST_MORE_INFORMATION") {
          const field = payload.field ?? "recipient.currentAddress";
          if (field !== "recipient.currentAddress")
            throw new Error("目前可要求補充實際居住地址。");
          if (!payload.reason?.trim())
            throw new Error("請填寫要求補件的原因，讓申請人知道需要補充什麼。");
          c.application.missingFields = [
            {
              field,
              label: payload.label?.trim() || "目前實際居住地址",
              reason: payload.reason.trim(),
            },
          ];
          c.application.amendment = {};
        }
        if (command === "SCHEDULE_ASSESSMENT") {
          if (
            !payload.scheduledAt ||
            !Number.isFinite(Date.parse(payload.scheduledAt))
          )
            throw new Error("請提供有效的到府評估日期與時間。");
          if (Date.parse(payload.scheduledAt) <= Date.now())
            throw new Error("到府評估時間必須晚於目前時間。");
          c.assessment.scheduledAt = new Date(
            payload.scheduledAt,
          ).toISOString();
          detail = c.assessment.scheduledAt;
        }
        if (command === "COMPLETE_ASSESSMENT") {
          c.assessment.summary =
            payload.summary?.trim() ||
            "已完成到府評估，待專業人員檢視照顧需求與計畫。";
          detail = c.assessment.summary;
        }
        if (command === "RETURN_APPLICATION") {
          if (!payload.reason?.trim())
            throw new Error("退回申請時需要提供具體修正原因。");
          invalidateApproval(c);
          c.draftStage = "READY_TO_REVIEW";
        }
        c.application.status =
          governmentTransitions[c.application.status][command]!;
        const eventType: Partial<Record<GovernmentCommand, string>> = {
          SCHEDULE_ASSESSMENT: "ASSESSMENT_SCHEDULED",
          COMPLETE_ASSESSMENT: "ASSESSMENT_COMPLETED",
          RETURN_APPLICATION: "APPLICATION_RETURNED",
        };
        addEvent(
          c,
          eventType[command] ?? command,
          commandLabels[command],
          detail,
        );
      });
    },
    getCaseState(id: string): CaseState {
      const c = service.getCase(id);
      let allowedActions: string[] = ["VIEW_CASE"];
      if (["DRAFT", "RETURNED"].includes(c.application.status)) {
        allowedActions = ["UPDATE_APPLICATION", "GRANT_CONSENT"];
        if (!Object.keys(validateCase(c)).length)
          allowedActions.push(
            "REVIEW_APPLICATION",
            "REQUEST_HUMAN_CONFIRMATION",
          );
        if (
          c.consent.finalSubmissionApproved &&
          c.consent.approvedRevision === c.dataRevision
        )
          allowedActions.push("SUBMIT_APPLICATION");
      } else if (c.application.status === "NEEDS_MORE_INFORMATION")
        allowedActions = [
          "VIEW_CASE",
          "UPDATE_APPLICATION",
          "SUBMIT_AMENDMENT",
        ];
      return {
        schemaVersion: 1,
        caseId: c.id,
        version: c.version,
        state:
          c.application.status === "DRAFT"
            ? c.draftStage
            : c.application.status,
        missingFields: c.application.missingFields,
        allowedActions,
        events: c.timelineEvents,
      };
    },
    reset(): void {
      try {
        storage.removeItem(SANDBOX_STORAGE_KEY);
      } catch {
        throw new Error("無法重置案件資料，請確認瀏覽器儲存權限後再試一次。");
      }
      notify();
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot(): number {
      return snapshot;
    },
  };
  if (typeof window !== "undefined" && storage === browserStorage) {
    window.addEventListener("storage", (event) => {
      if (event.key === SANDBOX_STORAGE_KEY || event.key === null) notify();
    });
  }
  return service;
}

export const sandboxService = createSandboxService();

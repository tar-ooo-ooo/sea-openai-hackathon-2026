import { z } from "zod";

const _date = z.string().datetime({ offset: true });
const _caseStatus = z.enum(["new", "assessing", "plan_review", "matching", "following_up", "closed"]);
const _careOverview = z.array(z.object({ title: z.string(), items: z.array(z.object({ label: z.string(), value: z.string().nullable() })) })).optional();
const _caseData = z.object({
  drafts: z.array(z.object({
    id: z.string().uuid(), status: z.literal("collecting"), targetName: z.string().nullable(),
    jurisdiction: z.string().nullable(), summary: z.string().nullable(),
    missingFields: z.array(z.string()), updatedAt: _date, careOverview: _careOverview,
  })),
  cases: z.array(z.object({
    id: z.string().uuid(), targetName: z.string(), summary: z.string(), caseStatus: _caseStatus.nullable(), createdAt: _date, updatedAt: _date, careOverview: _careOverview,
    services: z.array(z.object({
      id: z.string().uuid(), position: z.number().int().min(0).max(7),
      category: z.enum(["照顧及專業服務", "交通接送服務", "輔具及居家無障礙環境改善", "喘息服務"]),
      name: z.string(), reason: z.string(), status: z.enum(["尚未申請", "已送出"]),
    })),
  })),
});

export type CaseData = z.infer<typeof _caseData>;

export function caseStatusLabel(status: z.infer<typeof _caseStatus> | null) {
  return status === "new" ? "已收件"
    : status === "assessing" ? "評估中"
      : status === "plan_review" ? "照顧計畫確認中"
        : status === "matching" ? "服務媒合中"
          : status === "following_up" ? "服務追蹤中"
            : status === "closed" ? "已結案" : "待建立案件";
}

export function readCaseData(value: unknown): CaseData {
  return _caseData.parse(value);
}

export function readCaseDetail(value: unknown, kind: "case" | "draft"): CaseData {
  const result = z.object({ kind: z.literal(kind), item: z.unknown() }).parse(value);
  return readCaseData(kind === "draft" ? { drafts: [result.item], cases: [] } : { drafts: [], cases: [result.item] });
}

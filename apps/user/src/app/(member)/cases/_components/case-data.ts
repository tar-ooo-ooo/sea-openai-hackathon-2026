import { z } from "zod";

const _date = z.string().datetime({ offset: true });
const _careOverview = z.array(z.object({ title: z.string(), items: z.array(z.object({ label: z.string(), value: z.string().nullable() })) })).optional();
const _caseData = z.object({
  drafts: z.array(z.object({
    id: z.string().uuid(), status: z.literal("collecting"), targetName: z.string().nullable(),
    jurisdiction: z.string().nullable(), summary: z.string().nullable(),
    missingFields: z.array(z.string()), updatedAt: _date, careOverview: _careOverview,
  })),
  cases: z.array(z.object({
    id: z.string().uuid(), targetName: z.string(), summary: z.string(), createdAt: _date, updatedAt: _date, careOverview: _careOverview,
    services: z.array(z.object({
      id: z.string().uuid(), position: z.number().int().min(0).max(7),
      category: z.enum(["照顧及專業服務", "交通接送服務", "輔具及居家無障礙環境改善", "喘息服務"]),
      name: z.string(), reason: z.string(), status: z.enum(["尚未申請", "已送出"]),
    })),
  })),
});

export type CaseData = z.infer<typeof _caseData>;

export function readCaseData(value: unknown): CaseData {
  return _caseData.parse(value);
}

export function readCaseDetail(value: unknown, kind: "case" | "draft"): CaseData {
  const result = z.object({ kind: z.literal(kind), item: z.unknown() }).parse(value);
  return readCaseData(kind === "draft" ? { drafts: [result.item], cases: [] } : { drafts: [], cases: [result.item] });
}

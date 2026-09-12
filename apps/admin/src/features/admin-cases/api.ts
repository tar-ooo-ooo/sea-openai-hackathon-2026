import { fetchApi } from "@/lib/fetch-api";

export type AdminCaseListItem = {
  id: string;
  targetName: string;
  summary: string;
  serviceCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminCaseDetail = AdminCaseListItem & {
  services: Array<{
    id: string;
    position: number;
    category: string;
    name: string;
    reason: string;
    status: string;
  }>;
};

function _headers(cookie: string) {
  return { Cookie: cookie };
}

export async function loadAdminCases(cookie: string): Promise<AdminCaseListItem[]> {
  const result = await fetchApi<unknown>("/api/admin/cases", {
    cache: "no-store",
    headers: _headers(cookie),
  });

  if (!result || typeof result !== "object" || !("cases" in result) || !Array.isArray(result.cases)) {
    throw new Error("Invalid admin cases response");
  }

  if (!result.cases.every(_isAdminCaseListItem)) {
    throw new Error("Invalid admin cases response");
  }

  return result.cases;
}

export async function loadAdminCase(cookie: string, caseId: string): Promise<AdminCaseDetail | null> {
  try {
    const result = await fetchApi<unknown>(`/api/admin/cases/${caseId}`, {
      cache: "no-store",
      headers: _headers(cookie),
    });
    if (!result || typeof result !== "object" || !("case" in result) || !_isAdminCaseDetail(result.case)) {
      throw new Error("Invalid admin case response");
    }
    return result.case;
  } catch (error) {
    if (error instanceof Error && error.message.endsWith("404")) return null;
    throw error;
  }
}

function _isAdminCaseListItem(value: unknown): value is AdminCaseListItem {
  return !!value && typeof value === "object"
    && "id" in value && typeof value.id === "string"
    && "targetName" in value && typeof value.targetName === "string"
    && "summary" in value && typeof value.summary === "string"
    && "serviceCount" in value && typeof value.serviceCount === "number"
    && "createdAt" in value && typeof value.createdAt === "string"
    && "updatedAt" in value && typeof value.updatedAt === "string";
}

function _isAdminCaseDetail(value: unknown): value is AdminCaseDetail {
  return _isAdminCaseListItem(value)
    && "services" in value
    && Array.isArray(value.services)
    && value.services.every((service) => !!service && typeof service === "object"
      && "id" in service && typeof service.id === "string"
      && "position" in service && typeof service.position === "number"
      && "category" in service && typeof service.category === "string"
      && "name" in service && typeof service.name === "string"
      && "reason" in service && typeof service.reason === "string"
      && "status" in service && typeof service.status === "string");
}

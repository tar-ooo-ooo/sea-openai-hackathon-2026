import { fetchApi } from "@/lib/fetch-api";

export type AdminTriage = {
  id: string;
  userId: string;
  urgency: "emergency" | "follow_up";
  createdAt: string;
  name: string | null;
  phone: string | null;
  area: string | null;
};

export async function loadAdminTriages(cookie: string): Promise<AdminTriage[]> {
  const result = await fetchApi<unknown>("/api/admin/triages", {
    cache: "no-store", headers: { Cookie: cookie },
  });
  if (!result || typeof result !== "object" || !("triages" in result)
    || !Array.isArray(result.triages) || !result.triages.every(_isAdminTriage)) {
    throw new Error("Invalid triage response");
  }
  return result.triages;
}

function _isAdminTriage(value: unknown): value is AdminTriage {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && typeof row.userId === "string"
    && (row.urgency === "emergency" || row.urgency === "follow_up")
    && typeof row.createdAt === "string" && Number.isFinite(Date.parse(row.createdAt))
    && [row.name, row.phone, row.area].every((field) => field === null || typeof field === "string");
}

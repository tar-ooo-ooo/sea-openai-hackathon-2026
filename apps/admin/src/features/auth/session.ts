import { fetchApi } from "@/lib/fetch-api";

export type CurrentAdmin = {
  id: string;
  role: "admin";
};

export async function loadAdminSession(cookie?: string): Promise<CurrentAdmin | null> {
  const result = await fetchApi<unknown>("/api/admin-auth/session", {
    credentials: "include",
    cache: "no-store",
    ...(cookie ? { headers: { Cookie: cookie } } : {}),
  });

  if (!result || typeof result !== "object" || !("admin" in result)) {
    throw new Error("Invalid admin session response");
  }
  if (result.admin === null) return null;
  if (typeof result.admin !== "object" || !result.admin || !("id" in result.admin)
    || !("role" in result.admin) || typeof result.admin.id !== "string"
    || result.admin.role !== "admin") {
    throw new Error("Invalid admin session response");
  }

  return { id: result.admin.id, role: "admin" };
}

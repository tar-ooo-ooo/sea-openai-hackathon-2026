import { fetchApi } from "@/lib/fetch-api";

export type CurrentUser = { id: string; role: "user" };

export async function loadSession(cookie?: string): Promise<CurrentUser | null> {
  const result = await fetchApi<unknown>("/api/user-auth/session", {
    credentials: "include", cache: "no-store",
    ...(cookie ? { headers: { Cookie: cookie } } : {}),
  });
  if (!result || typeof result !== "object" || !("user" in result)) throw new Error("Invalid session response");
  if (result.user === null) return null;
  if (typeof result.user !== "object" || !result.user || !("id" in result.user) || !("role" in result.user)
    || typeof result.user.id !== "string" || result.user.role !== "user") throw new Error("Invalid session response");
  return { id: result.user.id, role: "user" };
}

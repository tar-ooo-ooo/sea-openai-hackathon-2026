import { clearDatabase as clearDatabaseMethod } from "../../methods/database/clear-database.ts";

// ponytail: MVP 暫不驗證身份；公開部署前改用 admin authorization。
export async function clearDatabase(): Promise<Response> {
  try {
    await clearDatabaseMethod();
    return Response.json({ cleared: true });
  } catch {
    return Response.json({ error: "Unable to clear database" }, { status: 500 });
  }
}

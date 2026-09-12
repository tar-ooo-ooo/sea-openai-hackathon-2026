import { listAdminTriageRows } from "../../services/admin-triages.ts";

export async function getAdminTriages() {
  return (await listAdminTriageRows()).map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

import { listUserCaseRows } from "../../services/user-cases.ts";
import { getMissingApplicationFields } from "../application-intakes/application-intake-rules.ts";

export async function listUserCases(userId: string, read: typeof listUserCaseRows = listUserCaseRows) {
  const rows = await read(userId);
  type PackageRow = (typeof rows.packages)[number];
  const cases = new Map<string, Omit<PackageRow, "service"> & { services: NonNullable<PackageRow["service"]>[] }>();
  for (const { service, ...record } of rows.packages) {
    let item = cases.get(record.id);
    if (!item) {
      item = { ...record, services: [] };
      cases.set(record.id, item);
    }
    if (service) item.services.push(service);
  }
  return {
    drafts: rows.drafts.map(({ id, data, updatedAt }) => ({
      id, status: "collecting" as const, targetName: data.recipient?.name ?? null,
      jurisdiction: data.jurisdiction ?? null,
      summary: data.careContext?.goal ?? data.careContext?.recentEvent ?? null,
      missingFields: getMissingApplicationFields(data), updatedAt,
    })),
    cases: [...cases.values()],
  };
}

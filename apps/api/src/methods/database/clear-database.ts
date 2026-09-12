import { truncatePublicTables } from "../../services/database.ts";

export async function clearDatabase(): Promise<void> {
  await truncatePublicTables();
}

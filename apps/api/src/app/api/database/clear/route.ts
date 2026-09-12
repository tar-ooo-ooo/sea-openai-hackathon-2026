import { clearDatabase } from "../../../../functions/database/clear-database.ts";

export async function POST() {
  return clearDatabase();
}

import { sql } from "drizzle-orm";
import { emergencyTriages, profiles } from "./db/schema.ts";
import type { TriageUrgency } from "../types/emergency-triage.ts";

export async function insertEmergencyTriage(userId: string, message: string, urgency: TriageUrgency) {
  const { db } = await import("./db/client.ts");
  const [row] = await db.insert(emergencyTriages).values({
    userId, message, urgency,
    // 同一 SQL 保存事件當下的姓名；沒有 profile 時 scalar subquery 回傳 NULL。
    userName: sql`(select ${profiles.name} from ${profiles} where ${profiles.userId} = ${userId} limit 1)`,
  })
    .returning({ id: emergencyTriages.id });
  if (!row) throw new Error("Triage insert failed");
  return row;
}

import { desc, eq, sql } from "drizzle-orm";
import { emergencyTriages, profiles } from "./db/schema.ts";

export async function listAdminTriageRows() {
  const { db } = await import("./db/client.ts");
  return db.select({
    id: emergencyTriages.id,
    userId: emergencyTriages.userId,
    urgency: emergencyTriages.urgency,
    message: emergencyTriages.message,
    createdAt: emergencyTriages.createdAt,
    name: profiles.name,
    phone: profiles.phone,
    area: profiles.area,
  }).from(emergencyTriages)
    .leftJoin(profiles, eq(profiles.userId, emergencyTriages.userId))
    .orderBy(sql`case when ${emergencyTriages.urgency} = 'emergency' then 0 else 1 end`, desc(emergencyTriages.createdAt), desc(emergencyTriages.id));
}

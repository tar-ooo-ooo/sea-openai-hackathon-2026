import { eq } from "drizzle-orm";
import { profiles } from "./db/schema.ts";
import type { ProfileInput } from "../types/profile.ts";

export async function findProfile(userId: string) {
  const { db } = await import("./db/client.ts");
  const [profile] = await db.select({
    name: profiles.name, birthDate: profiles.birthDate, area: profiles.area,
    phone: profiles.phone, updatedAt: profiles.updatedAt,
  }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return profile ?? null;
}

export async function saveProfile(userId: string, input: ProfileInput) {
  const { db } = await import("./db/client.ts");
  const [profile] = await db.insert(profiles).values({ userId, ...input })
    .onConflictDoUpdate({ target: profiles.userId, set: { ...input, updatedAt: new Date() } })
    .returning({ name: profiles.name, birthDate: profiles.birthDate, area: profiles.area,
      phone: profiles.phone, updatedAt: profiles.updatedAt });
  return profile;
}

import { eq } from "drizzle-orm";
import { users } from "./db/schema";

export async function findUserByNationalId(nationalId: string) {
  const { db } = await import("./db/client");
  const [user] = await db.select().from(users).where(eq(users.nationalId, nationalId)).limit(1);
  return user;
}

export async function findUserById(id: string) {
  const { db } = await import("./db/client");
  const [user] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  return user;
}

export async function insertUser(nationalId: string, passwordHash: string, role: "user") {
  const { db } = await import("./db/client");
  const [user] = await db.insert(users).values({ nationalId, passwordHash, role })
    .onConflictDoNothing({ target: users.nationalId }).returning({ id: users.id, role: users.role });
  return user;
}

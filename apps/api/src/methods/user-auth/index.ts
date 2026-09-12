import { findUserById, findUserByNationalId, insertUser } from "../../services/user-auth.ts";
import { createSessionToken, getSessionSecret, hashPassword, readSessionToken, verifyPassword } from "./credentials.ts";

export const userSessionCookieName = "care_user_session";

export async function authenticateUser(nationalId: string, password: string, register: boolean) {
  const secret = getSessionSecret();
  if (register) {
    const user = await insertUser(nationalId, await hashPassword(password), "user");
    return user ? { user, token: createSessionToken(user.id, secret) } : null;
  }
  const user = await findUserByNationalId(nationalId);
  // 未知帳號仍執行同等成本的雜湊，減少帳號存在與否的時間差。
  const hash = user?.passwordHash ?? `scrypt-v1:${"0".repeat(32)}:${"0".repeat(128)}`;
  const valid = await verifyPassword(password, hash);
  if (!user || !valid || user.role !== "user") return null;
  return { user: { id: user.id, role: user.role }, token: createSessionToken(user.id, secret) };
}

export async function getCurrentUser(token: string | undefined) {
  if (!token) return null;
  const id = readSessionToken(token, getSessionSecret());
  if (!id) return null;
  const user = await findUserById(id);
  return user?.role === "user" ? user : null;
}

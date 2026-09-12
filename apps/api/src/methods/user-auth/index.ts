import { findUserById, findUserByNationalId, insertUser } from "../../services/user-auth.ts";
import { createSessionToken, getSessionSecret, hashPassword, readSessionToken, verifyPassword } from "./credentials.ts";

export const userSessionCookieName = "care_user_session";

type AccountRole = "user" | "admin";

async function _authenticateByRole(nationalId: string, password: string, role: AccountRole) {
  const secret = getSessionSecret();
  const user = await findUserByNationalId(nationalId);
  const hash = user?.passwordHash ?? `scrypt-v1:${"0".repeat(32)}:${"0".repeat(128)}`;
  const valid = await verifyPassword(password, hash);

  if (!user || !valid || user.role !== role) return null;

  return {
    user: { id: user.id, role: user.role },
    token: createSessionToken(user.id, secret),
  };
}

async function _getCurrentAccount(token: string | undefined, role: AccountRole) {
  if (!token) return null;

  const id = readSessionToken(token, getSessionSecret());
  if (!id) return null;

  const user = await findUserById(id);
  return user?.role === role ? user : null;
}

export async function authenticateUser(nationalId: string, password: string, register: boolean) {
  const secret = getSessionSecret();
  if (register) {
    const user = await insertUser(nationalId, await hashPassword(password), "user");
    return user ? { user, token: createSessionToken(user.id, secret) } : null;
  }

  return _authenticateByRole(nationalId, password, "user");
}

export async function authenticateAdmin(nationalId: string, password: string) {
  return _authenticateByRole(nationalId, password, "admin");
}

export async function getCurrentUser(token: string | undefined) {
  return _getCurrentAccount(token, "user");
}

export async function getCurrentAdmin(token: string | undefined) {
  return _getCurrentAccount(token, "admin");
}

import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export function isValidNationalId(value: string): boolean {
  if (!/^[A-Z][12]\d{8}$/.test(value)) return false;
  const codes = "ABCDEFGHJKLMNPQRSTUVXYWZIO";
  const code = codes.indexOf(value[0]) + 10;
  const sum = Math.floor(code / 10) + (code % 10) * 9
    + [...value.slice(1)].reduce((total, digit, index) => total + Number(digit) * (index === 8 ? 1 : 8 - index), 0);
  return sum % 10 === 0;
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8 && value.length <= 128 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

function _derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await _derive(password, salt);
  return `scrypt-v1:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!/^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored)) return false;
  const [, salt, hash] = stored.split(":");
  return timingSafeEqual(await _derive(password, salt), Buffer.from(hash, "hex"));
}

export function getSessionSecret(): string {
  const secret = process.env.USER_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("User session configuration unavailable");
  return secret;
}

export function createSessionToken(userId: string, secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt: now + 8 * 60 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readSessionToken(token: string, secret: string, now = Date.now()): string | null {
  if (token.length > 512) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return null;
  const expected = createHmac("sha256", secret).update(parts[0]).digest();
  const signature = Buffer.from(parts[1], "base64url");
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    if (!value || typeof value !== "object" || !("userId" in value) || !("expiresAt" in value)) return null;
    return typeof value.userId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.userId)
      && typeof value.expiresAt === "number" && value.expiresAt > now ? value.userId : null;
  } catch { return null; }
}

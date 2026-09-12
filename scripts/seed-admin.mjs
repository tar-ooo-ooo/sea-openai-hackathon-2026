import { randomBytes, scrypt } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

const _rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const _insertAdminStatement = `
  INSERT INTO users (national_id, password_hash, role)
  VALUES ($1, $2, 'admin')
  ON CONFLICT (national_id) DO NOTHING
  RETURNING id
`;

function _derivePasswordKey(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export function isValidNationalId(value) {
  if (!/^[A-Z][12]\d{8}$/.test(value)) return false;

  const codes = "ABCDEFGHJKLMNPQRSTUVXYWZIO";
  const code = codes.indexOf(value[0]) + 10;
  const sum = Math.floor(code / 10) + (code % 10) * 9
    + [...value.slice(1)].reduce((total, digit, index) => total + Number(digit) * (index === 8 ? 1 : 8 - index), 0);

  return sum % 10 === 0;
}

export function isValidPassword(value) {
  return value.length >= 8 && value.length <= 128 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await _derivePasswordKey(password, salt);
  return `scrypt-v1:${salt}:${key.toString("hex")}`;
}

export async function seedAdminAccount(query, nationalId, password) {
  const passwordHash = await hashPassword(password);
  const rows = await query(_insertAdminStatement, [nationalId, passwordHash]);
  return rows[0]?.id ?? null;
}

function _readSeedInput(environment) {
  const nationalId = environment.ADMIN_NATIONAL_ID?.trim().toUpperCase();
  const password = environment.ADMIN_PASSWORD;

  if (!nationalId || !isValidNationalId(nationalId)) {
    throw new Error("ADMIN_NATIONAL_ID must be a valid national ID.");
  }
  if (!password || !isValidPassword(password)) {
    throw new Error("ADMIN_PASSWORD must be 8 to 128 characters and include letters and numbers.");
  }

  return { nationalId, password };
}

export async function seedAdmin(environment = process.env) {
  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const { nationalId, password } = _readSeedInput(environment);
  const sql = neon(databaseUrl);
  return seedAdminAccount(sql.query.bind(sql), nationalId, password);
}

config({ path: resolve(_rootDirectory, ".env.local"), quiet: true });

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const id = await seedAdmin();
    if (!id) {
      console.error("An account with this national ID already exists. No changes were made.");
      process.exitCode = 1;
    } else {
      console.log("Admin account created.");
    }
  } catch {
    console.error("Admin seed failed. Check the local environment variables and database migration status.");
    process.exitCode = 1;
  }
}

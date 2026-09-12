import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidNationalId, isValidPassword, hashPassword, verifyPassword, createSessionToken, readSessionToken } from "./credentials.ts";

test("身分證格式與檢查碼必須正確", () => {
  assert.equal(isValidNationalId("A123456789"), true);
  for (const value of ["A123456788", "A323456789", "", "a123456789", "A123"]) assert.equal(isValidNationalId(value), false);
});
test("密碼規則限制長度且包含英文與數字", () => {
  assert.equal(isValidPassword("Example123"), true);
  for (const value of ["short1", "abcdefgh", "12345678", "a1".repeat(65)]) assert.equal(isValidPassword(value), false);
});
test("密碼以隨機 salt 保存且拒絕錯誤密碼與未知格式", async () => {
  const hash = await hashPassword("Example123");
  assert.notEqual(hash, await hashPassword("Example123"));
  assert.equal(await verifyPassword("Example123", hash), true);
  assert.equal(await verifyPassword("Wrong123", hash), false);
  assert.equal(await verifyPassword("Example123", "plaintext"), false);
});
test("session 必須有正確簽章、有效 UUID 且未過期", () => {
  const id = "22a0a6cb-27b9-4daa-b97c-37cebcfc07d5";
  const secret = "test-only-secret-not-for-runtime";
  const token = createSessionToken(id, secret, 1000);
  assert.equal(readSessionToken(token, secret, 2000), id);
  assert.equal(readSessionToken(token, secret, 1000 + 8 * 60 * 60 * 1000), null);
  assert.equal(readSessionToken(token, "other-secret", 2000), null);
  assert.equal(readSessionToken(`x${token}`, secret, 2000), null);
  assert.equal(readSessionToken(`${token}.extra`, secret, 2000), null);
  assert.equal(readSessionToken(createSessionToken("admin", secret, 1000), secret, 2000), null);
});

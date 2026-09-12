import assert from "node:assert/strict";
import { test } from "node:test";

import { hashPassword, isValidNationalId, isValidPassword, seedAdminAccount } from "./seed-admin.mjs";

test("seed administrator validates the supported credentials", () => {
  assert.equal(isValidNationalId("A123456789"), true);
  assert.equal(isValidNationalId("A123456788"), false);
  assert.equal(isValidPassword("Example123"), true);
  assert.equal(isValidPassword("password"), false);
});

test("seed administrator creates an scrypt hash and only inserts an admin role", async () => {
  const passwordHash = await hashPassword("Example123");
  assert.match(passwordHash, /^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/);

  const calls = [];
  const id = await seedAdminAccount(async (statement, values) => {
    calls.push({ statement, values });
    return [{ id: "22a0a6cb-27b9-4daa-b97c-37cebcfc07d5" }];
  }, "A123456789", "Example123");

  assert.equal(id, "22a0a6cb-27b9-4daa-b97c-37cebcfc07d5");
  assert.equal(calls.length, 1);
  assert.match(calls[0].statement, /VALUES \(\$1, \$2, 'admin'\)/);
  assert.equal(calls[0].values[0], "A123456789");
  assert.match(calls[0].values[1], /^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/);
});

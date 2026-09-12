import assert from "node:assert/strict";
import { test } from "node:test";

import { isAllowedAdminOrigin } from "./allowed-origin.ts";

test("後台 API 只接受後台專用 origin", () => {
  const environment = process.env.NODE_ENV;
  const origins = process.env.ADMIN_ALLOWED_ORIGINS;
  try {
    delete process.env.NODE_ENV;
    assert.equal(isAllowedAdminOrigin("http://localhost:3001"), true);
    assert.equal(isAllowedAdminOrigin("http://localhost:3000"), false);

    process.env.NODE_ENV = "production";
    process.env.ADMIN_ALLOWED_ORIGINS = "https://staff.example";
    assert.equal(isAllowedAdminOrigin("https://staff.example"), true);
    assert.equal(isAllowedAdminOrigin("https://care.example"), false);
  } finally {
    if (environment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = environment;
    if (origins === undefined) delete process.env.ADMIN_ALLOWED_ORIGINS;
    else process.env.ADMIN_ALLOWED_ORIGINS = origins;
  }
});

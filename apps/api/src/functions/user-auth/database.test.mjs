import assert from "node:assert/strict";
import { randomBytes, randomInt } from "node:crypto";
import { test } from "node:test";
import { isValidNationalId } from "../../methods/user-auth/credentials.ts";

// 明確 opt-in：會透過本機 API 在目前資料庫保留一筆隨機測試帳號。
test("真實資料庫註冊、重複帳號、登入、session 與登出", { skip: process.env.AUTH_DATABASE_TEST !== "1" }, async () => {
  const base = "http://localhost:3002/api/user-auth";
  const prefix = `A1${String(randomInt(10_000_000)).padStart(7, "0")}`;
  const nationalId = Array.from({ length: 10 }, (_, digit) => `${prefix}${digit}`).find(isValidNationalId);
  assert.ok(nationalId);
  const password = `Test9-${randomBytes(24).toString("hex")}`;
  const headers = { Origin: "http://localhost:3000", "Content-Type": "application/json" };
  const post = (action, body, cookie) => fetch(`${base}/${action}`, {
    method: "POST", headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
  });
  const registration = await post("register", { nationalId, password, role: "admin" });
  assert.equal(registration.status, 201, "註冊必須實際寫入成功");
  const result = await registration.json();
  assert.equal(result.user.role, "user", "不可由前端指定專員角色");
  assert.deepEqual(Object.keys(result.user).sort(), ["id", "role"]);
  const setCookie = registration.headers.get("set-cookie");
  assert.ok(typeof setCookie === "string" && /HttpOnly/i.test(setCookie), "缺少 HttpOnly cookie");
  assert.ok(/SameSite=lax/i.test(setCookie), "缺少 SameSite cookie 限制");
  const cookie = setCookie.split(";")[0];
  // 獨立請求等同頁面重新載入時向 API 再確認身份。
  for (let index = 0; index < 2; index++) {
    const session = await fetch(`${base}/session`, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(15_000) });
    assert.equal(session.status, 200);
    assert.deepEqual(await session.json(), result);
  }
  const duplicate = await post("register", { nationalId, password });
  assert.equal(duplicate.status, 409);
  assert.ok(duplicate.headers.get("set-cookie") === null, "重複帳號不得建立 cookie");
  const wrongPassword = await post("login", { nationalId, password: "WrongPassword123" });
  assert.equal(wrongPassword.status, 401);
  assert.ok(wrongPassword.headers.get("set-cookie") === null, "錯誤密碼不得建立 cookie");
  const login = await post("login", { nationalId: nationalId.toLowerCase(), password });
  assert.equal(login.status, 200);
  assert.deepEqual(await login.json(), result);
  const logout = await post("logout", {}, cookie);
  assert.equal(logout.status, 200);
  assert.ok(/Max-Age=0/i.test(logout.headers.get("set-cookie") ?? ""), "登出必須清除 cookie");
  const anonymous = await fetch(`${base}/session`, { signal: AbortSignal.timeout(15_000) });
  assert.deepEqual(await anonymous.json(), { user: null });
  // 只輸出新建立的 UUID，不輸出身分證、密碼或 session token。
  console.log(`保留測試帳號 UUID：${result.user.id}`);
});

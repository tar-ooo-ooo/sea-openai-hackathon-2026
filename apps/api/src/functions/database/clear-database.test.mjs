import assert from "node:assert/strict";
import { test } from "node:test";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost/test";

const { db } = await import("../../services/db/client.ts");
const { clearDatabase } = await import("./clear-database.ts");

test("clearDatabase 動態清空 public 資料表", async (context) => {
  let query = "";

  context.mock.method(db, "execute", async (statement) => {
    query = db.dialect.sqlToQuery(statement).sql;
  });

  const response = await clearDatabase();

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { cleared: true });
  assert.match(query, /FROM pg_tables/);
  assert.match(query, /TRUNCATE TABLE/);
});

test("clearDatabase 不回傳資料庫錯誤內容", async (context) => {
  context.mock.method(db, "execute", async () => {
    throw new Error("database secret");
  });

  const response = await clearDatabase();

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to clear database" });
});

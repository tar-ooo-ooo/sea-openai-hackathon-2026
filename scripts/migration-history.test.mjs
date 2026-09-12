import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

test("migration 編號、原始時間與 snapshot 形成單一連續歷史", () => {
  const directory = new URL("../drizzle/", import.meta.url);
  const journal = JSON.parse(readFileSync(new URL("meta/_journal.json", directory), "utf8"));
  let previousId = "00000000-0000-0000-0000-000000000000";
  let previousTime = -Infinity;
  const sqlFiles = [];
  for (const [index, entry] of journal.entries.entries()) {
    const prefix = String(index).padStart(4, "0");
    assert.equal(entry.idx, index);
    assert.ok(entry.tag.startsWith(`${prefix}_`));
    assert.ok(entry.when > previousTime, "migration 時間必須遞增，避免已套用的資料庫跳過變更");
    const snapshot = JSON.parse(readFileSync(new URL(`meta/${prefix}_snapshot.json`, directory), "utf8"));
    assert.equal(snapshot.prevId, previousId);
    assert.ok(readFileSync(new URL(`${entry.tag}.sql`, directory), "utf8").trim());
    sqlFiles.push(`${entry.tag}.sql`);
    previousId = snapshot.id;
    previousTime = entry.when;
  }
  assert.deepEqual(readdirSync(directory).filter((file) => file.endsWith(".sql")).sort(), sqlFiles.sort());
});

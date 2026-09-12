import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { emergencyTriages } from "./db/schema.ts";

test("事件姓名可為空，寫入以登入者 ID 查 profile，不接受客戶端姓名", () => {
  assert.equal(emergencyTriages.userName.name, "user_name");
  assert.equal(emergencyTriages.userName.notNull, false);
  assert.equal(emergencyTriages.userName.length, 100);
  const source = readFileSync(new URL("./emergency-triages.ts", import.meta.url), "utf8");
  assert.match(source, /insertEmergencyTriage\(userId: string, message: string, urgency: TriageUrgency\)/);
  assert.match(source, /userName: sql`\(select \$\{profiles.name\} from \$\{profiles\} where \$\{profiles.userId\} = \$\{userId\} limit 1\)`/);
  assert.doesNotMatch(source, /\.update\(|\.innerJoin\(/);
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { partitionChatHistory } from "./chat-context.ts";

test("對話達到門檻時摘要舊訊息並保留最近 20 則", () => {
  const messages = Array.from({ length: 80 }, (_, index) => index);
  const context = partitionChatHistory(messages);

  assert.deepEqual(context.messagesToSummarize, messages.slice(0, 60));
  assert.deepEqual(context.recentMessages, messages.slice(60));
  assert.deepEqual(partitionChatHistory(messages.slice(0, 79)).recentMessages, messages.slice(0, 79));
});

import { desc, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { chatMessages } from "./db/schema.ts";

export async function listRecentChatMessages(userId: string) {
  const messages = await db
    .select({ role: chatMessages.role, content: chatMessages.content })
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(100);

  return messages.reverse();
}

export async function saveChatMessage(
  userId: string,
  role: "assistant" | "user",
  content: string,
) {
  await db.insert(chatMessages).values({ userId, role, content: content.slice(0, 4000) });
}

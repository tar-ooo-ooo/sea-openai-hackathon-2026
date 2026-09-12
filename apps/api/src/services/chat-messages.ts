import { and, asc, eq, gt, or } from "drizzle-orm";
import { db } from "./db/client.ts";
import { chatMessages, chatSummaries } from "./db/schema.ts";

export async function getChatSummary(userId: string) {
  const [summary] = await db
    .select({
      summary: chatSummaries.summary,
      lastMessageId: chatSummaries.lastMessageId,
      lastMessageCreatedAt: chatSummaries.lastMessageCreatedAt,
    })
    .from(chatSummaries)
    .where(eq(chatSummaries.userId, userId))
    .limit(1);

  return summary;
}

export async function listChatMessagesAfter(
  userId: string,
  cursor?: { id: string; createdAt: Date },
) {
  const afterCursor = cursor
    ? or(
        gt(chatMessages.createdAt, cursor.createdAt),
        and(eq(chatMessages.createdAt, cursor.createdAt), gt(chatMessages.id, cursor.id)),
      )
    : undefined;
  const messages = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), afterCursor))
    .orderBy(asc(chatMessages.createdAt), asc(chatMessages.id))
    .limit(100);

  return messages;
}

export async function saveChatSummary(
  userId: string,
  summary: string,
  lastMessage: { id: string; createdAt: Date },
) {
  await db
    .insert(chatSummaries)
    .values({
      userId,
      summary,
      lastMessageId: lastMessage.id,
      lastMessageCreatedAt: lastMessage.createdAt,
    })
    .onConflictDoUpdate({
      target: chatSummaries.userId,
      set: {
        summary,
        lastMessageId: lastMessage.id,
        lastMessageCreatedAt: lastMessage.createdAt,
        updatedAt: new Date(),
      },
    });
}

export async function saveChatMessage(
  userId: string,
  role: "assistant" | "user",
  content: string,
) {
  await db.insert(chatMessages).values({ userId, role, content: content.slice(0, 4000) });
}

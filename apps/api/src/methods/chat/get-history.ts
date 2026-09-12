import { listRecentChatMessages } from "../../services/chat-messages.ts";

export async function getChatHistory(userId: string) {
  return listRecentChatMessages(userId);
}

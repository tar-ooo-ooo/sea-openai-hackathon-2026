import { handleChat } from "../../functions/chat/handle-chat.ts";

export function POST() {
  return handleChat();
}

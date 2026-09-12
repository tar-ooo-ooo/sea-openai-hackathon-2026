import { handleChat } from "../../functions/chat/handle-chat.ts";

export async function POST(request: Request) {
  return handleChat(request);
}

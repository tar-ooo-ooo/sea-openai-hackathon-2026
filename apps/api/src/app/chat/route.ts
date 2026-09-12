import type { NextRequest } from "next/server";
import { handleChat } from "../../functions/chat/handle-chat.ts";

export async function POST(request: NextRequest) {
  return handleChat(request);
}

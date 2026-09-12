import { runChatAgent } from "../../services/openai/chat-agent.ts";

export async function sendMessage(message: string): Promise<string> {
  return runChatAgent(message);
}

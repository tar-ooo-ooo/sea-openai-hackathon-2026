import { runChatAgent } from "../../services/openai/chat-agent.ts";

export type ChatProgress = {
  id: string;
  label: string;
  status: "active" | "complete";
};

export async function sendMessage(
  message: string,
  onProgress?: (progress: ChatProgress) => void,
): Promise<string> {
  onProgress?.({ id: "prepare", label: "正在準備本次協助", status: "active" });
  onProgress?.({ id: "prepare", label: "已準備本次協助", status: "complete" });
  onProgress?.({ id: "analysis", label: "正在整理回覆", status: "active" });

  const reply = await runChatAgent(message);

  onProgress?.({ id: "analysis", label: "已整理回覆", status: "complete" });
  onProgress?.({ id: "reply", label: "已完成回覆", status: "complete" });

  return reply;
}

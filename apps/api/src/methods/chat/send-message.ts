import { runChatAgent } from "../../services/openai/chat-agent.ts";
import { findCollectingApplicationIntake } from "../../services/application-intakes.ts";
import { listRecentChatMessages, saveChatMessage } from "../../services/chat-messages.ts";
import {
  collectApplicationIntake,
  getOrCreateApplicationIntake,
} from "../application-intakes/collect-application-intake.ts";
import {
  getMissingApplicationFields,
  optionalApplicationFields,
} from "../application-intakes/application-intake-rules.ts";

export type ChatProgress = {
  id: string;
  label: string;
  status: "active" | "complete";
};

export async function sendMessage(
  message: string,
  onProgress?: (progress: ChatProgress) => void,
  userId?: string,
): Promise<string> {
  onProgress?.({ id: "prepare", label: "正在準備本次協助", status: "active" });
  onProgress?.({ id: "prepare", label: "已準備本次協助", status: "complete" });
  onProgress?.({ id: "analysis", label: "正在整理回覆", status: "active" });

  const isApplicationIntent = /(?:申請|辦理).{0,8}長照|長照.{0,8}(?:申請|辦理)/.test(message);

  const [existingIntake, history] = userId
    ? await Promise.all([
        findCollectingApplicationIntake(userId),
        listRecentChatMessages(userId),
      ])
    : [undefined, []];
  if (userId) await saveChatMessage(userId, "user", message);
  const intake =
    userId && (existingIntake || isApplicationIntent)
      ? (existingIntake ?? (await getOrCreateApplicationIntake(userId)))
      : undefined;
  const reply = !userId && isApplicationIntent
    ? "請先登入後再開始收整長照申請資料。"
    : intake
    ? await runChatAgent(message, {
        data: intake.data,
        missingFields: getMissingApplicationFields(intake.data),
        optionalFields: optionalApplicationFields,
        collect: (patch) =>
          collectApplicationIntake(intake.userId, intake.id, intake.data, patch),
      }, history)
    : await runChatAgent(message, undefined, history);

  if (userId) await saveChatMessage(userId, "assistant", reply);

  onProgress?.({ id: "analysis", label: "已整理回覆", status: "complete" });
  onProgress?.({ id: "reply", label: "已完成回覆", status: "complete" });

  return reply;
}

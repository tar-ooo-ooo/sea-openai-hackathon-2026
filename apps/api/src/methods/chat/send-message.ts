import { runChatAgent, summarizeChatHistory } from "../../services/openai/chat-agent.ts";
import {
  findCollectingApplicationIntake,
  findLatestPackagedApplicationIntake,
} from "../../services/application-intakes.ts";
import {
  getChatSummary,
  listChatMessagesAfter,
  saveChatMessage,
  saveChatSummary,
} from "../../services/chat-messages.ts";
import {
  collectApplicationIntake,
  getOrCreateApplicationIntake,
  prepareApplicationForm,
  updateApplicationPackage,
} from "../application-intakes/collect-application-intake.ts";
import {
  getMissingApplicationFields,
  normalizeApplicationIntakeData,
  optionalApplicationFields,
} from "../application-intakes/application-intake-rules.ts";
import { partitionChatHistory } from "./chat-context.ts";

export type ChatProgress = {
  id: string;
  label: string;
  status: "active" | "complete";
};

export type ChatResult = {
  reply: string;
  action?: { type: "application_computer"; intakeId: string };
};

export async function sendMessage(
  message: string,
  userId: string,
  onProgress?: (progress: ChatProgress) => void,
): Promise<ChatResult> {
  onProgress?.({ id: "prepare", label: "正在準備本次協助", status: "active" });
  onProgress?.({ id: "prepare", label: "已準備本次協助", status: "complete" });
  onProgress?.({ id: "analysis", label: "正在整理回覆", status: "active" });

  const isApplicationIntent = /(?:申請|辦理).{0,8}長照|長照.{0,8}(?:申請|辦理)/.test(message);
  const isPackageUpdateIntent =
    /(?:修改|更新|調整|更換|換成|改成|新增|移除|刪除).{0,12}(?:禮包|服務)|(?:禮包|服務).{0,12}(?:修改|更新|調整|更換|換成|改成|新增|移除|刪除)/.test(
      message,
    );

  const [existingIntake, packagedIntake, storedSummary] = await Promise.all([
    findCollectingApplicationIntake(userId),
    isPackageUpdateIntent ? findLatestPackagedApplicationIntake(userId) : undefined,
    getChatSummary(userId),
  ]);
  const unsummarizedMessages = await listChatMessagesAfter(
    userId,
    storedSummary
      ? { id: storedSummary.lastMessageId, createdAt: storedSummary.lastMessageCreatedAt }
      : undefined,
  );
  const { messagesToSummarize, recentMessages } = partitionChatHistory(unsummarizedMessages);
  let summary = storedSummary?.summary ?? "";
  let history = recentMessages;

  if (messagesToSummarize.length > 0) {
    try {
      const nextSummary = await summarizeChatHistory(summary, messagesToSummarize);
      const lastMessage = messagesToSummarize.at(-1)!;
      await saveChatSummary(userId, nextSummary, lastMessage);
      summary = nextSummary;
    } catch {
      history = unsummarizedMessages;
    }
    // ponytail: 若同一使用者需要高併發，再以 transaction 或 advisory lock 序列化摘要更新。
  }

  await saveChatMessage(userId, "user", message);
  const intake =
    existingIntake ??
    (isApplicationIntent
      ? await getOrCreateApplicationIntake(userId)
      : isPackageUpdateIntent
        ? packagedIntake
        : undefined);
  let reply: string;
  let action: ChatResult["action"];
  if (!intake && isPackageUpdateIntent) {
    reply = "目前找不到可修改的長照服務禮包，請先完成一份長照申請資料。";
  } else if (intake) {
    const applicationData = normalizeApplicationIntakeData(intake.data);
    reply = await runChatAgent(
      message,
      {
        status: intake.status,
        data: applicationData,
        missingFields: getMissingApplicationFields(applicationData),
        optionalFields: optionalApplicationFields,
        collect: (patch) =>
          collectApplicationIntake(intake.userId, intake.id, intake.data, patch),
        prepare: async () => {
          onProgress?.({ id: "form", label: "正在整理申請資料", status: "active" });
          const result = await prepareApplicationForm(intake.userId, intake.id);
          if (result.status === "ready") {
            action = { type: "application_computer", intakeId: intake.id };
          }
          onProgress?.({ id: "form", label: "已完成申請資料整理", status: "complete" });
          return result;
        },
        update: (patch) => updateApplicationPackage(intake.userId, intake.id, patch),
      },
      history,
      summary,
    );
  } else {
    reply = await runChatAgent(message, undefined, history, summary);
  }

  await saveChatMessage(userId, "assistant", reply);

  onProgress?.({ id: "analysis", label: "已整理回覆", status: "complete" });
  onProgress?.({ id: "reply", label: "已完成回覆", status: "complete" });

  return { reply, ...(action ? { action } : {}) };
}

import { runChatAgent } from "../../services/openai/chat-agent.ts";
import {
  findCollectingApplicationIntake,
  findLatestPackagedApplicationIntake,
} from "../../services/application-intakes.ts";
import { listRecentChatMessages, saveChatMessage } from "../../services/chat-messages.ts";
import {
  collectApplicationIntake,
  generateApplicationPackage,
  getOrCreateApplicationIntake,
  updateApplicationPackage,
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
  userId: string,
  onProgress?: (progress: ChatProgress) => void,
): Promise<string> {
  onProgress?.({ id: "prepare", label: "正在準備本次協助", status: "active" });
  onProgress?.({ id: "prepare", label: "已準備本次協助", status: "complete" });
  onProgress?.({ id: "analysis", label: "正在整理回覆", status: "active" });

  const isApplicationIntent = /(?:申請|辦理).{0,8}長照|長照.{0,8}(?:申請|辦理)/.test(message);
  const isPackageUpdateIntent =
    /(?:修改|更新|調整|更換|換成|改成|新增|移除|刪除).{0,12}(?:禮包|服務)|(?:禮包|服務).{0,12}(?:修改|更新|調整|更換|換成|改成|新增|移除|刪除)/.test(
      message,
    );

  const [existingIntake, packagedIntake, history] = await Promise.all([
    findCollectingApplicationIntake(userId),
    isPackageUpdateIntent ? findLatestPackagedApplicationIntake(userId) : undefined,
    listRecentChatMessages(userId),
  ]);
  await saveChatMessage(userId, "user", message);
  const intake =
    existingIntake ??
    (isApplicationIntent
      ? await getOrCreateApplicationIntake(userId)
      : isPackageUpdateIntent
        ? packagedIntake
        : undefined);
  let reply: string;
  if (!intake && isPackageUpdateIntent) {
    reply = "目前找不到可修改的長照服務禮包，請先完成一份長照申請資料。";
  } else if (intake) {
    reply = await runChatAgent(
      message,
      {
        status: intake.status,
        data: intake.data,
        missingFields: getMissingApplicationFields(intake.data),
        optionalFields: optionalApplicationFields,
        collect: (patch) =>
          collectApplicationIntake(intake.userId, intake.id, intake.data, patch),
        generate: () => generateApplicationPackage(intake.userId, intake.id),
        update: (patch) => updateApplicationPackage(intake.userId, intake.id, patch),
      },
      history,
    );
  } else {
    reply = await runChatAgent(message, undefined, history);
  }

  await saveChatMessage(userId, "assistant", reply);

  onProgress?.({ id: "analysis", label: "已整理回覆", status: "complete" });
  onProgress?.({ id: "reply", label: "已完成回覆", status: "complete" });

  return reply;
}

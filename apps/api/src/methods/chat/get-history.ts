import { listRecentChatMessages } from "../../services/chat-messages.ts";
import { findCollectingApplicationIntake } from "../../services/application-intakes.ts";

export async function getChatHistory(
  userId: string,
  list = listRecentChatMessages,
  findIntake = findCollectingApplicationIntake,
) {
  const [messages, intake] = await Promise.all([list(userId), findIntake(userId)]);
  if (!intake?.formReview) return messages;
  const applicationUrl = `http://localhost:3003/apply/${intake.id}`;
  const actionIndex = messages.findLastIndex((message) => message.role === "assistant"
    && (message.content.includes(applicationUrl) || message.content.includes("資料已收整完成")));
  return messages.map((message, index) => index === actionIndex
    ? { ...message, action: { type: "application_computer" as const, intakeId: intake.id } }
    : message);
}

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
  return messages.map((message) => message.role === "assistant" && message.content.includes(applicationUrl)
    ? { ...message, action: { type: "application_computer" as const, intakeId: intake.id } }
    : message);
}

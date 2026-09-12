import { classifyEmergencyMessage } from "../../services/openai/emergency-triage.ts";
import { insertEmergencyTriage } from "../../services/emergency-triages.ts";
import { triageClassificationSchema } from "../../types/emergency-triage.ts";

export async function evaluateEmergencyTriage(
  userId: string,
  message: string,
  classify = classifyEmergencyMessage,
  save = insertEmergencyTriage,
) {
  const { urgency } = triageClassificationSchema.parse(await classify(message));
  if (urgency === "normal") return { urgency, saved: false, triageId: null };
  const row = await save(userId, message, urgency);
  return { urgency, saved: true, triageId: row.id };
}

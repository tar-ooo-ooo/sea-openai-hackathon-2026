import { z } from "zod";

export const triageClassificationSchema = z.object({
  urgency: z.enum(["normal", "follow_up", "emergency"]),
}).strict();

export type TriageUrgency = "follow_up" | "emergency";

import { Agent, Runner } from "@openai/agents";

const _chatAgent = new Agent({
  name: "長照服務助手",
  instructions: "你是長照服務助手。請使用繁體中文，提供簡潔且清楚的協助。",
  model: "gpt-5.6-luna",
  modelSettings: {
    maxTokens: 1000,
    reasoning: { effort: "none" },
    store: false,
  },
});
const _runner = new Runner({ tracingDisabled: true });

export async function runChatAgent(message: string): Promise<string> {
  const result = await _runner.run(_chatAgent, message, { maxTurns: 2 });

  if (typeof result.finalOutput !== "string" || !result.finalOutput.trim()) {
    throw new Error("Agent returned an empty response");
  }

  return result.finalOutput.trim();
}

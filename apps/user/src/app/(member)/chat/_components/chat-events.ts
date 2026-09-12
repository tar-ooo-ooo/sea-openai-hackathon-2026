export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatProgress = { id: string; label: string; status: "active" | "complete" };
type ChatEvent = { type: "progress"; progress: ChatProgress } | { type: "result"; result: { reply: string } };

export function readHistory(value: unknown): ChatMessage[] {
  if (!value || typeof value !== "object" || !("messages" in value) || !Array.isArray(value.messages)) {
    throw new Error("Invalid history");
  }
  return value.messages.map((message: unknown) => {
    if (!message || typeof message !== "object" || !("role" in message) || !("content" in message)
      || (message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string") {
      throw new Error("Invalid message");
    }
    return { role: message.role, content: message.content };
  });
}

export async function readChatStream(stream: ReadableStream<Uint8Array>, onEvent: (event: ChatEvent) => void) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  const consume = (line: string) => {
    if (!line.trim()) return;
    if (completed) throw new Error("Unexpected event after result");
    const event: unknown = JSON.parse(line);
    if (!event || typeof event !== "object" || !("type" in event)) throw new Error("Invalid event");
    if (event.type === "error") throw new Error("Chat service failed");
    if (event.type === "result" && "result" in event && event.result && typeof event.result === "object"
      && "reply" in event.result && typeof event.result.reply === "string" && event.result.reply.trim()) {
      completed = true;
      onEvent({ type: "result", result: { reply: event.result.reply } });
      return;
    }
    if (event.type === "progress" && "progress" in event && event.progress && typeof event.progress === "object") {
      const progress = event.progress;
      if ("id" in progress && typeof progress.id === "string" && "label" in progress && typeof progress.label === "string"
        && "status" in progress && (progress.status === "active" || progress.status === "complete")) {
        onEvent({ type: "progress", progress: { id: progress.id, label: progress.label, status: progress.status } });
        return;
      }
    }
    throw new Error("Invalid event");
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) consume(line);
      if (buffer.length > 100_000) throw new Error("Event too large");
      if (done) break;
    }
    consume(buffer);
    if (!completed) throw new Error("Incomplete chat stream");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

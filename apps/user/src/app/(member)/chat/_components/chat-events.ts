export type ApplicationAction = { type: "application_review"; caseId: string };
export type ChatMessage = { role: "user" | "assistant"; content: string; action?: ApplicationAction };

export function validateTriageResult(value: unknown): void {
  if (value && typeof value === "object" && "urgency" in value && "saved" in value && "triageId" in value) {
    if (value.urgency === "normal" && value.saved === false && value.triageId === null) return;
    if ((value.urgency === "follow_up" || value.urgency === "emergency") && value.saved === true
      && typeof value.triageId === "string"
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.triageId)) return;
  }
  throw new Error("Invalid triage result");
}

// 動作是可選的附加資訊；不合法時保留文字，不產生可操作入口。
function _readAction(value: unknown): ApplicationAction | undefined {
  if (!value || typeof value !== "object" || !("type" in value) || value.type !== "application_review"
    || !("caseId" in value) || typeof value.caseId !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.caseId)) return undefined;
  return { type: "application_review", caseId: value.caseId.toLowerCase() };
}
export function shouldSendOnEnter(event: Pick<KeyboardEvent, "key" | "shiftKey" | "metaKey" | "isComposing" | "keyCode">): boolean {
  return event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.isComposing && event.keyCode !== 229;
}
export type ChatProgress = { id: string; label: string; status: "active" | "complete" };
type ChatEvent = { type: "progress"; progress: ChatProgress } | { type: "result"; result: { reply: string; action?: ApplicationAction } };

export function normalizeAssistantContent(content: string) {
  return content
    .replace(
      /(?:\*\*)?已收整完成。(?:\*\*)?\s*Sol 已完成表單欄位分析，?\s*/g,
      "資料已收整完成。",
    )
    .replace(/\*\*((?:資料)?已收整完成。)\*\*/g, "$1");
}

export function readHistory(value: unknown): ChatMessage[] {
  if (!value || typeof value !== "object" || !("messages" in value) || !Array.isArray(value.messages)) {
    throw new Error("Invalid history");
  }
  return value.messages.map((message: unknown) => {
    if (!message || typeof message !== "object" || !("role" in message) || !("content" in message)
      || (message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string") {
      throw new Error("Invalid message");
    }
    const action = message.role === "assistant" && "action" in message ? _readAction(message.action) : undefined;
    return {
      role: message.role,
      content: message.role === "assistant" ? normalizeAssistantContent(message.content) : message.content,
      ...(action ? { action } : {}),
    };
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
      const action = "action" in event.result ? _readAction(event.result.action) : undefined;
      onEvent({ type: "result", result: { reply: normalizeAssistantContent(event.result.reply), ...(action ? { action } : {}) } });
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

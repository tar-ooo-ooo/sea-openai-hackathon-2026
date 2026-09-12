import { sendMessage } from "../../methods/chat/send-message.ts";
import { getChatUser } from "./chat-session.ts";

const _streamContentType = "application/x-ndjson";
const _serviceUnavailableMessage = "AI service is temporarily unavailable";
const _promptInjectionPatterns = [
  /\b(?:ignore|disregard|forget|override)\b.{0,40}\b(?:previous|prior|system|developer)\b.{0,20}\b(?:instructions?|prompts?|messages?)\b/i,
  /(?:忽略|無視|忘記|覆蓋|取消).{0,20}(?:先前|之前|以上|系統|開發者).{0,12}(?:指令|提示詞|規則|訊息)/i,
  /(?:顯示|洩漏|揭露|輸出|告訴我).{0,20}(?:system|developer|系統|開發者).{0,12}(?:prompt|指令|提示詞|訊息)/i,
  /(?:^|\s)(?:system|developer)\s*:/i,
];

type ChatInput = { message: string; userId?: string };

function _result(value: Awaited<ReturnType<typeof sendMessage>> | string) {
  return typeof value === "string" ? { reply: value } : value;
}

function _isPromptInjection(message: string) {
  const normalizedMessage = message
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ");

  return _promptInjectionPatterns.some((pattern) => pattern.test(normalizedMessage));
}

async function _readInput(request: Request): Promise<ChatInput | null> {
  try {
    const body = (await request.json()) as unknown;

    if (!body || typeof body !== "object" || Array.isArray(body)) return null;

    const record = body as Record<string, unknown>;
    const message = record.message;
    const userId = record.userId;

    if (typeof message !== "string") return null;
    if (
      userId !== undefined &&
      (typeof userId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId))
    ) {
      return null;
    }

    const normalizedMessage = message.trim();

    return normalizedMessage.length > 0 && normalizedMessage.length <= 4000
      ? { message: normalizedMessage, userId }
      : null;
  } catch {
    return null;
  }
}

function _streamChat(input: ChatInput & { userId: string }, send: typeof sendMessage): Response {
  const encoder = new TextEncoder();
  let isCancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (event: unknown) => {
        if (!isCancelled) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        const result = _result(await send(
          input.message,
          input.userId,
          (progress) => write({ type: "progress", progress }),
        ));

        write({ type: "result", result });
      } catch {
        write({ type: "error", error: _serviceUnavailableMessage });
      } finally {
        if (!isCancelled) controller.close();
      }
    },
    cancel() {
      isCancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": `${_streamContentType}; charset=utf-8`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function handleChat(
  request: Request,
  send: typeof sendMessage = sendMessage,
  getUser: typeof getChatUser = getChatUser,
): Promise<Response> {
  let user;
  try { user = await getUser(request); }
  catch { return Response.json({ error: "Unable to verify session" }, { status: 503 }); }
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });
  const input = await _readInput(request);

  if (!input) {
    return Response.json(
      { error: "message must contain 1 to 4000 characters; userId must be a UUID if provided" },
      { status: 400 },
    );
  }

  // 相容舊 client，但絕不允許指定其他人的資料。
  if (input.userId && input.userId !== user.id) {
    return Response.json({ error: "User does not match session" }, { status: 403 });
  }
  if (_isPromptInjection(input.message)) {
    return Response.json(
      { error: "訊息疑似包含提示詞注入指令，請改用一般問題描述。" },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "AI service is not configured" }, { status: 503 });
  }

  if (request.headers.get("accept")?.includes(_streamContentType)) {
    return _streamChat({ ...input, userId: user.id }, send);
  }

  try {
    return Response.json(_result(await send(input.message, user.id)));
  } catch {
    return Response.json({ error: _serviceUnavailableMessage }, { status: 502 });
  }
}

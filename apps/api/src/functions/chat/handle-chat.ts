import type { NextRequest } from "next/server";
import { sendMessage } from "../../methods/chat/send-message.ts";
import { getCurrentUser, userSessionCookieName } from "../../methods/user-auth/index.ts";

const _streamContentType = "application/x-ndjson";
const _serviceUnavailableMessage = "AI service is temporarily unavailable";
const _promptInjectionPatterns = [
  /\b(?:ignore|disregard|forget|override)\b.{0,40}\b(?:previous|prior|system|developer)\b.{0,20}\b(?:instructions?|prompts?|messages?)\b/i,
  /(?:忽略|無視|忘記|覆蓋|取消).{0,20}(?:先前|之前|以上|系統|開發者).{0,12}(?:指令|提示詞|規則|訊息)/i,
  /(?:顯示|洩漏|揭露|輸出|告訴我).{0,20}(?:system|developer|系統|開發者).{0,12}(?:prompt|指令|提示詞|訊息)/i,
  /(?:^|\s)(?:system|developer)\s*:/i,
];

type ChatInput = { message: string; userId: string };

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
      typeof userId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        userId,
      )
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

function _streamChat(input: ChatInput, send: typeof sendMessage): Response {
  const encoder = new TextEncoder();
  let isCancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (event: unknown) => {
        if (!isCancelled) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        const reply = await send(
          input.message,
          input.userId,
          (progress) => write({ type: "progress", progress }),
        );

        write({ type: "result", result: { reply } });
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
  request: NextRequest,
  send: typeof sendMessage = sendMessage,
  getUser: typeof getCurrentUser = getCurrentUser,
): Promise<Response> {
  const input = await _readInput(request);

  if (!input) {
    return Response.json(
      { error: "message must contain 1 to 4000 characters and userId is required and must be a UUID" },
      { status: 400 },
    );
  }

  let user;
  try {
    user = await getUser(request.cookies.get(userSessionCookieName)?.value);
  } catch {
    return Response.json({ error: _serviceUnavailableMessage }, { status: 502 });
  }
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (user.id !== input.userId) {
    return Response.json({ error: "userId does not match the authenticated user" }, { status: 403 });
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
    return _streamChat(input, send);
  }

  try {
    return Response.json({ reply: await send(input.message, input.userId) });
  } catch {
    return Response.json({ error: _serviceUnavailableMessage }, { status: 502 });
  }
}

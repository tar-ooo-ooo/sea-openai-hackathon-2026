import { sendMessage } from "../../methods/chat/send-message.ts";

const _streamContentType = "application/x-ndjson";
const _serviceUnavailableMessage = "AI service is temporarily unavailable";

async function _readMessage(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as unknown;

    if (!body || typeof body !== "object" || Array.isArray(body)) return null;

    const message = (body as Record<string, unknown>).message;

    if (typeof message !== "string") return null;

    const normalizedMessage = message.trim();

    return normalizedMessage.length > 0 && normalizedMessage.length <= 4000
      ? normalizedMessage
      : null;
  } catch {
    return null;
  }
}

function _streamChat(message: string, send: typeof sendMessage): Response {
  const encoder = new TextEncoder();
  let isCancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (event: unknown) => {
        if (!isCancelled) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        const reply = await send(message, (progress) => write({ type: "progress", progress }));

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
  request: Request,
  send: typeof sendMessage = sendMessage,
): Promise<Response> {
  const message = await _readMessage(request);

  if (!message) {
    return Response.json({ error: "message must contain 1 to 4000 characters" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "AI service is not configured" }, { status: 503 });
  }

  if (request.headers.get("accept")?.includes(_streamContentType)) {
    return _streamChat(message, send);
  }

  try {
    return Response.json({ reply: await send(message) });
  } catch {
    return Response.json({ error: _serviceUnavailableMessage }, { status: 502 });
  }
}

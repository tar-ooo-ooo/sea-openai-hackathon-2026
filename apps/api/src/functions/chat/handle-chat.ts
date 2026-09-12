import { sendMessage } from "../../methods/chat/send-message.ts";

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

export async function handleChat(request: Request): Promise<Response> {
  const message = await _readMessage(request);

  if (!message) {
    return Response.json({ error: "message must contain 1 to 4000 characters" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "AI service is not configured" }, { status: 503 });
  }

  try {
    return Response.json({ reply: await sendMessage(message) });
  } catch {
    return Response.json({ error: "AI service is temporarily unavailable" }, { status: 502 });
  }
}

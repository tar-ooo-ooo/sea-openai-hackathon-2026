import { getChatHistory } from "../../methods/chat/get-history.ts";
import { getChatUser } from "./chat-session.ts";

export async function handleHistory(
  request: Request,
  getUser: typeof getChatUser = getChatUser,
  list: typeof getChatHistory = getChatHistory,
) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: "Please sign in" }, { status: 401, headers });
    return Response.json({ messages: await list(user.id) }, { headers });
  } catch {
    return Response.json({ error: "Unable to load chat history" }, { status: 503, headers });
  }
}

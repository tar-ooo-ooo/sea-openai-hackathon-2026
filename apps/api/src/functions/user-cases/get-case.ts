import { NextRequest } from "next/server.js";
import { getCurrentUser } from "../../methods/user-auth/index.ts";
import { getUserCase } from "../../methods/user-cases/get-case.ts";

export async function handleGetCase(request: Request, id: string, kind: "case" | "draft", getUser = getCurrentUser, get = getUserCase) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const token = new NextRequest(request.url, { headers: request.headers }).cookies.get("care_user_session")?.value;
    const user = await getUser(token);
    if (!user) return Response.json({ error: "請先登入。" }, { status: 401, headers });
    if (user.role !== "user") return Response.json({ error: "無法存取使用者案件。" }, { status: 403, headers });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || new URL(request.url).search) {
      return Response.json({ error: "無效的查詢參數。" }, { status: 400, headers });
    }
    const item = await get(user.id, id.toLowerCase(), kind);
    if (!item) return Response.json({ error: "找不到此案件或草稿。" }, { status: 404, headers });
    return Response.json({ kind, item }, { headers });
  } catch {
    return Response.json({ error: "暫時無法讀取詳細資料，請稍後重試。" }, { status: 503, headers });
  }
}

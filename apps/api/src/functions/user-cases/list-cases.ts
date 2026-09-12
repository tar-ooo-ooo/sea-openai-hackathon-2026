import { NextRequest } from "next/server.js";
import { getCurrentUser } from "../../methods/user-auth/index.ts";
import { listUserCases } from "../../methods/user-cases/list-cases.ts";

export async function handleListCases(
  request: Request,
  getUser: typeof getCurrentUser = getCurrentUser,
  list: typeof listUserCases = listUserCases,
) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const token = new NextRequest(request.url, { headers: request.headers }).cookies.get("care_user_session")?.value;
    const user = await getUser(token);
    if (!user) return Response.json({ error: "請先登入。" }, { status: 401, headers });
    if (user.role !== "user") return Response.json({ error: "無法存取使用者案件。" }, { status: 403, headers });
    // 身分只取自 session，禁止 query 指定其他人。
    if (new URL(request.url).search) return Response.json({ error: "此 API 不接受查詢參數。" }, { status: 400, headers });
    return Response.json(await list(user.id), { headers });
  } catch {
    return Response.json({ error: "暫時無法讀取案件，請稍後再試。" }, { status: 503, headers });
  }
}

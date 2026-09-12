import { NextRequest } from "next/server.js";
import { getCurrentUser } from "../../methods/user-auth/index.ts";

export async function getChatUser(request: Request) {
  // 只解析 headers，不複製／鎖定原始 POST body。
  const token = new NextRequest(request.url, { headers: request.headers }).cookies.get("care_user_session")?.value;
  return getCurrentUser(token);
}

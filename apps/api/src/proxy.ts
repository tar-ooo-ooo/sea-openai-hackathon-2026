import { NextResponse, type NextRequest } from "next/server.js";
import { isAllowedOrigin } from "./lib/allowed-origin.ts";

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowed = isAllowedOrigin(origin);
  if ((origin && !allowed) || (request.method === "OPTIONS" && !allowed)) {
    return NextResponse.json({ error: "不允許此來源。" }, {
      status: 403,
      headers: { Vary: "Origin", "Cache-Control": "no-store" },
    });
  }

  const response = request.method === "OPTIONS"
    ? new NextResponse(null, { status: 204 })
    : NextResponse.next();
  response.headers.append("Vary", "Origin");
  if (allowed && origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  return response;
}

// API app 的所有端點（包含 /chat），僅排除 Next.js 靜態資源。
export const config = { matcher: ["/((?!_next/|favicon.ico$).*)"] };

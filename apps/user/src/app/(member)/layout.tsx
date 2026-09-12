import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { loadSession } from "@/features/auth/session";
import MemberNavigation from "./_components/MemberNavigation";

export const dynamic = "force-dynamic";

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const cookie = (await cookies()).get("care_user_session");
  if (!cookie) redirect("/login");
  let user;
  try { user = await loadSession(`${cookie.name}=${cookie.value}`); }
  catch {
    return <main className="service-error"><h1>暫時無法確認登入狀態</h1><p>請確認 API 服務已啟動，再重新整理頁面。你的帳號不會因此被刪除。</p><Link className="button secondary" href="/login">返回登入</Link></main>;
  }
  if (!user) redirect("/login");
  return <div className="member-shell"><MemberNavigation /><div className="member-body"><header className="member-header"><span>使用者服務專區</span><span className="member-label">已登入</span></header><main className="member-content">{children}</main></div></div>;
}

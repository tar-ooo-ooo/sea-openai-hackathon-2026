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
  return <div className="member-shell"><MemberNavigation /><div className="member-body"><header className="member-header"><span>使用者服務專區</span><div className="member-account"><Link href="/profile" className="member-profile-link" aria-label="個人檔案" title="個人檔案"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg></Link><span className="member-label">已登入</span></div></header><main className="member-content">{children}</main></div></div>;
}

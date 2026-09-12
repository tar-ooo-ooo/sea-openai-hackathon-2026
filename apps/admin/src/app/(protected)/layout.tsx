import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/LogoutButton";
import { loadAdminSession } from "@/features/auth/session";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cookie = (await cookies()).get("care_admin_session");
  if (!cookie) redirect("/login");

  let admin;
  try {
    admin = await loadAdminSession(`${cookie.name}=${cookie.value}`);
  } catch {
    return (
      <main className="auth-service-error">
        <h1>暫時無法確認專員登入狀態</h1>
        <p>請確認 API 服務已啟動後再試一次。</p>
        <Link className="primary-link" href="/login">回到登入頁</Link>
      </main>
    );
  }
  if (!admin) redirect("/login");

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          <span className="brand-mark">A</span>
          <span><strong>照護個案管理</strong><small>AI Care Management Console</small></span>
        </Link>
        <nav aria-label="主要導覽" className="main-nav">
          <Link href="/">工作首頁</Link>
          <Link href="/#application-cases-heading">申請資料</Link>
          <Link href="/#care-cases-heading">已接案個案</Link>
          <Link href="/#triages-heading">緊急分流</Link>
        </nav>
        <div className="manager-badge">
          <span aria-hidden="true">專</span>
          <p>專員帳戶 <small>已登入</small></p>
          <LogoutButton />
        </div>
      </header>
      <main className="page-shell">{children}</main>
    </>
  );
}

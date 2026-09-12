import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "照護個案管理 | Sea × OpenAI Hackathon 2026",
  description: "A 單位個案管理員後台 Demo",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        <header className="site-header">
          <Link className="brand" href="/"><span className="brand-mark">A</span><span><strong>照護個案管理</strong><small>AI Care Management Console</small></span></Link>
          <nav aria-label="主要導覽" className="main-nav">
            <Link href="/">工作首頁</Link>
            <Link href="/cases/demo">個案</Link>
            <Link href="/cases/demo/care-plan">照顧計畫</Link>
            <Link href="/cases/demo/follow-up">追蹤</Link>
          </nav>
          <div className="manager-badge"><span aria-hidden="true">陳</span><p>陳怡安 <small>個案管理員</small></p></div>
        </header>
        <main className="page-shell">{children}</main>
      </body>
    </html>
  );
}

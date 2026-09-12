"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { fetchApi } from "@/lib/fetch-api";

const _links = [{ href: "/home", label: "首頁", symbol: "⌂" }, { href: "/chat", label: "智慧小幫手", symbol: "✳" }, { href: "/cases", label: "我的案件", symbol: "▤" }];

export default function MemberNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await fetchApi("/api/user-auth/logout", { method: "POST", credentials: "include" });
      router.replace("/login"); router.refresh();
    } catch { setError("登出未完成，請再試一次。"); }
    finally { setBusy(false); }
  }
  return <aside className="sidebar"><Link href="/home" className="brand"><span className="brand-mark">伴</span>長照好伴</Link><p className="sidebar-caption">陪你整理照顧的下一步</p>
    <nav aria-label="主要導覽">{_links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}><span aria-hidden="true">{link.symbol}</span>{link.label}</Link>)}</nav>
    <div className="sidebar-bottom"><p className="small muted">一步一步來，<br />先從你最需要的協助開始。</p>{error && <p role="alert" className="error-message">{error}</p>}<button className="logout-button" onClick={logout} disabled={busy}>{busy ? "登出中…" : "登出帳號"}</button></div>
  </aside>;
}

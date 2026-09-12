"use client";

import { Component, useEffect, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  ExternalLink,
  HandHeart,
  Menu,
  Printer,
  X,
} from "lucide-react";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }
  render() {
    return this.state.error ? (
      <main className="fatal-error">
        <h1>資料暫時無法開啟</h1>
        <p>{this.state.error}</p>
        <p>
          請確認瀏覽器允許此網站儲存資料，再重新整理。既有資料不會被自動清除。
        </p>
        <button className="button primary" onClick={() => window.location.reload()}>
          重新載入
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Layout({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const path = usePathname();
  const section = path.startsWith("/apply")
    ? "申請長照服務"
    : path.startsWith("/cases")
      ? "案件與進度"
      : "服務說明";

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (window.location.hash) {
        document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
      } else {
        window.scrollTo({ top: 0 });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [path]);

  useEffect(() => {
    if (!menu) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menu]);

  return (
    <div className="government-shell">
      <a href="#main-content" className="skip-link">
        跳至主要內容
      </a>
      <header className="government-header">
        <div className="government-container government-header-inner">
          <Link
            href="/"
            className="government-brand"
            onClick={() => setMenu(false)}
            aria-label="長照申辦首頁"
          >
            <HandHeart
              className="government-brand-icon"
              size={46}
              strokeWidth={1.7}
              aria-hidden="true"
            />
            <span className="government-brand-copy">
              <strong>長期照顧服務</strong>
              <span>線上申辦服務</span>
            </span>
          </Link>
          <div className="government-utilities" aria-label="網站工具">
            <button type="button" onClick={() => window.print()}>
              <Printer size={14} aria-hidden="true" /> 友善列印
            </button>
          </div>
          <button
            type="button"
            className="government-menu-toggle"
            aria-label={menu ? "關閉選單" : "開啟選單"}
            aria-expanded={menu}
            aria-controls="government-navigation"
            onClick={() => setMenu((open) => !open)}
          >
            {menu ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </header>
      <nav
        id="government-navigation"
        className={`government-navigation ${menu ? "is-open" : ""}`}
        aria-label="主要導覽"
        onClick={() => setMenu(false)}
      >
        <div className="government-container government-navigation-inner">
          <Link href="/" aria-current={path === "/" ? "page" : undefined}>
            服務說明
          </Link>
          <Link href="/#eligibility">申請對象</Link>
          <Link href="/#application-process">申請流程</Link>
          <Link
            href="/apply"
            aria-current={path.startsWith("/apply") ? "page" : undefined}
          >
            申請長照服務
          </Link>
          <Link
            href="/cases"
            aria-current={path.startsWith("/cases") ? "page" : undefined}
          >
            案件與進度
          </Link>
        </div>
      </nav>
      <div className="government-container government-content-area">
        <div className="government-breadcrumb" aria-label="所在位置">
          <span>現在位置：</span>
          <Link href="/">首頁</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span>{section}</span>
        </div>
        <main id="main-content" className="government-main" tabIndex={-1}>
          {children}
        </main>
      </div>
      <footer className="government-footer">
        <div className="government-container government-footer-inner">
          <div>
            <strong>長期照顧服務・線上申辦服務</strong>
            <p>線上申請、案件查詢與補件服務。</p>
          </div>
          <div className="government-footer-service">
            <span>長照服務諮詢</span>
            <a href="tel:1966" aria-label="撥打長照服務專線 1966">
              1966
            </a>
            <a
              href="https://1966.gov.tw/LTC/cp-6533-70777-207.html"
              target="_blank"
              rel="noreferrer"
            >
              前往衛福部長照專區 <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default function GovernmentShell({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Layout>{children}</Layout>
    </ErrorBoundary>
  );
}

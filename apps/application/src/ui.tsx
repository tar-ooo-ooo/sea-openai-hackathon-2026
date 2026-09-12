"use client";

import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { sandboxService, statusLabels } from "./services/sandbox";
import type { CaseStatus } from "./types";

export function useSandbox() {
  useSyncExternalStore(sandboxService.subscribe, sandboxService.getSnapshot, () => 0);
  return sandboxService;
}
export function Badge({ status }: { status: CaseStatus }) {
  return (
    <span
      className={`badge ${status === "NEEDS_MORE_INFORMATION" || status === "RETURNED" ? "amber" : status === "DRAFT" ? "" : "green"}`}
    >
      <span className="status-dot" />
      {statusLabels[status]}
    </span>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function Notice({
  children,
  warning = false,
}: {
  children: ReactNode;
  warning?: boolean;
}) {
  return (
    <div
      className={`notice ${warning ? "warning" : ""}`}
      role={warning ? "alert" : undefined}
    >
      {warning ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
      <div>{children}</div>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="panel empty-state">
      <div className="empty-symbol">◇</div>
      <h2>{title}</h2>
      {children}
      <Link className="button secondary" href="/">
        <ArrowLeft size={18} />
        回到總覽
      </Link>
    </section>
  );
}
export function dateTime(value: string | null) {
  return value
    ? new Date(value).toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "尚未安排";
}
export function saveFile(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function errorText(error: unknown) {
  return error instanceof Error ? error.message : "操作未完成，請再試一次。";
}

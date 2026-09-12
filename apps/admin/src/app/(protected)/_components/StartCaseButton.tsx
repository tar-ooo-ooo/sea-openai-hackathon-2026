"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchApi } from "@/lib/fetch-api";

export function StartCaseButton({ careCaseId }: { careCaseId: string }) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function _startCase() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const result = await fetchApi<{ success: boolean }>(`/api/admin/care-cases/${careCaseId}/actions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", summary: "專員開始接案", expectedStatus: "new" }),
      });
      if (result.success !== true) throw new Error("Invalid response");
      router.refresh();
    } catch {
      setError("無法開始接案，請重新整理後確認案件狀態。");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className="start-case-action">
      <button type="button" disabled={pending} onClick={_startCase}>{pending ? "接案中…" : "開始接案"}</button>
      {error && <span role="alert">{error}</span>}
    </div>
  );
}

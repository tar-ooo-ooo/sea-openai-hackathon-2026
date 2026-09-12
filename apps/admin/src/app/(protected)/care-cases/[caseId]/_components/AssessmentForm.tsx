"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchApi } from "@/lib/fetch-api";

export function AssessmentForm({ careCaseId }: { careCaseId: string }) {
  const router = useRouter();
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function _submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (busy.current) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const summary = formData.get("summary");
    const cmsLevel = formData.get("cmsLevel");
    const body: { summary: string; cmsLevel?: number } = { summary: typeof summary === "string" ? summary : "" };
    if (typeof cmsLevel === "string" && cmsLevel !== "") body.cmsLevel = Number(cmsLevel);

    busy.current = true;
    setIsSubmitting(true);
    try {
      const result = await fetchApi<unknown>(`/api/admin/care-cases/${careCaseId}/assessments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!result || typeof result !== "object" || !("assessment" in result)
        || !result.assessment || typeof result.assessment !== "object"
        || !("id" in result.assessment) || typeof result.assessment.id !== "string") {
        throw new Error("Invalid assessment response");
      }
      form.reset();
      router.refresh();
    } catch {
      setError("暫時無法儲存評估，請確認登入與 API 狀態後再試一次。");
    } finally {
      busy.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form className="assessment-form" onSubmit={_submit}>
      <label htmlFor="cms-level">CMS 等級（可留空）</label>
      <input id="cms-level" max="99" min="0" name="cmsLevel" type="number" />
      <label htmlFor="assessment-summary">評估摘要</label>
      <textarea id="assessment-summary" maxLength={4000} name="summary" required rows={4} />
      <button disabled={isSubmitting} type="submit">{isSubmitting ? "儲存中…" : "儲存評估"}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

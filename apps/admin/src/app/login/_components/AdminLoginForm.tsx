"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { loadAdminSession } from "@/features/auth/session";
import { fetchApi } from "@/lib/fetch-api";

export function AdminLoginForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const pending = useRef(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;

    const data = new FormData(event.currentTarget);
    const nationalId = String(data.get("nationalId") ?? "").trim().toUpperCase();
    const password = String(data.get("password") ?? "");
    setError("");
    pending.current = true;
    setBusy(true);

    try {
      await fetchApi("/api/admin-auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalId, password }),
      });
      if (!await loadAdminSession()) throw new Error("Admin session unavailable");
      router.replace("/");
      router.refresh();
    } catch {
      setError("帳號、密碼錯誤，或此帳戶沒有專員權限。請洽系統管理員確認帳戶狀態。");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="admin-auth-form">
      <p className="eyebrow">ADMIN LOGIN</p>
      <h2>登入專員後台</h2>
      <p>請使用由系統管理員建立的專員帳戶。</p>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={busy}>
          <label htmlFor="national-id">身分證字號</label>
          <input autoComplete="username" id="national-id" maxLength={10} name="nationalId" pattern="[A-Za-z][12][0-9]{8}" placeholder="A123456789" required />
          <label htmlFor="password">密碼</label>
          <div className="admin-password-field">
            <input aria-describedby="password-hint" autoComplete="current-password" id="password" maxLength={128} minLength={8} name="password" pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,128}" required type={showPassword ? "text" : "password"} />
            <button aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} type="button">{showPassword ? "隱藏" : "顯示"}</button>
          </div>
          <p className="form-hint" id="password-hint">密碼長度為 8 至 128 字元，且須包含英文字母與數字。</p>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="admin-submit" type="submit">{busy ? "登入中…" : "登入後台"}</button>
        </fieldset>
      </form>
    </div>
  );
}

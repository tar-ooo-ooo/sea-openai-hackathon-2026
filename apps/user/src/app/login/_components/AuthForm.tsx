"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/fetch-api";
import { loadSession } from "@/features/auth/session";

export default function AuthForm() {
  const [registering, setRegistering] = useState(false);
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
    if (registering && password !== data.get("confirmation")) { setError("兩次輸入的密碼不一致。"); return; }
    pending.current = true;
    setBusy(true);
    try {
      await fetchApi(`/api/user-auth/${registering ? "register" : "login"}`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalId, password }),
      });
      // 確認瀏覽器確實保存 cookie，再進入受保護頁面。
      if (!await loadSession()) throw new Error("Session unavailable");
      router.replace("/home");
      router.refresh();
    } catch {
      setError(registering
        ? "無法完成註冊或建立登入狀態。請確認身分證字號；若已註冊請切換登入，或稍後再試。"
        : "登入未完成。請確認身分證字號與密碼，或稍後再試；若持續失敗，請確認 API 服務已啟動。");
    } finally { pending.current = false; setBusy(false); }
  }

  return <div className="auth-form-wrap">
    <p className="eyebrow">歡迎來到長照好伴</p>
    <h2>{registering ? "建立你的帳號" : "登入，繼續照顧的下一步"}</h2>
    <p className="muted">{registering ? "保存需求整理，之後可以隨時回來繼續。" : "使用你的身分證字號與密碼登入。"}</p>
    <div className="auth-tabs" aria-label="帳號操作">
      <button type="button" aria-pressed={!registering} disabled={busy} onClick={() => { setRegistering(false); setError(""); }}>登入</button>
      <button type="button" aria-pressed={registering} disabled={busy} onClick={() => { setRegistering(true); setError(""); }}>註冊</button>
    </div>
    <form onSubmit={handleSubmit}>
      <fieldset disabled={busy}>
        <label htmlFor="national-id">身分證字號</label>
        <input id="national-id" name="nationalId" autoComplete="username" maxLength={10} pattern="[A-Za-z][12][0-9]{8}" title="請輸入 10 碼有效的臺灣身分證字號" placeholder="請輸入身分證字號" required />
        <label htmlFor="password">密碼</label>
        <div className="password-field"><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={registering ? "new-password" : "current-password"} minLength={8} maxLength={128} pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,128}" title="8 至 128 字，至少包含一個英文字母和數字" aria-describedby="password-hint" required />
          <button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "隱藏" : "顯示"}</button></div>
        <p id="password-hint" className="small muted">8 至 128 字，須包含英文字母與數字。</p>
        {registering && <><label htmlFor="confirmation">再次輸入密碼</label><input id="confirmation" name="confirmation" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={128} required /></>}
        {error && <p className="error-message" role="alert">{error}</p>}
        <button className="button primary full" type="submit">{busy ? "正在處理…" : registering ? "建立帳號並登入" : "登入"}<span aria-hidden="true">→</span></button>
      </fieldset>
    </form>
    <p className="small muted">本次為黑客松 Demo，請勿使用真實個資或常用密碼。</p>
  </div>;
}

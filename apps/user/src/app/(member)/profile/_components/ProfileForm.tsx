"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { fetchApi } from "@/lib/fetch-api";
import styles from "./profile.module.css";

const _response = z.object({ profile: z.object({
  name: z.string(), birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  area: z.string(), phone: z.string(), updatedAt: z.string().datetime({ offset: true }),
}).nullable() });
const _empty = { name: "", birthDate: "", area: "", phone: "" };

export default function ProfileForm() {
  const [form, setForm] = useState(_empty);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const saveLock = useRef(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    let active = true;
    fetchApi<unknown>("/api/profile", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then((value) => {
        const { profile } = _response.parse(value);
        if (active) {
          setForm(profile ? { name: profile.name, birthDate: profile.birthDate, area: profile.area, phone: profile.phone } : _empty);
          setMessage(profile ? "已載入目前保存的個人檔案。" : "尚未建立個人檔案，請填妥下列四項資料。");
        }
      })
      .catch(() => { if (active) { setLoadFailed(true); setError("無法載入個人檔案，請重試；若登入已過期，請重新登入。"); } })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); requestRef.current?.abort(); };
  }, [revision]);

  async function save() {
    if (saveLock.current || loading || loadFailed) return;
    saveLock.current = true;
    setSaving(true); setError(""); setMessage("");
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const { profile } = _response.parse(await fetchApi<unknown>("/api/profile", {
        method: "PUT", credentials: "include", signal: controller.signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      }));
      if (!profile) throw new Error("Invalid saved profile");
      setForm({ name: profile.name, birthDate: profile.birthDate, area: profile.area, phone: profile.phone });
      setMessage("個人檔案已儲存。這不會修改案件資料或送出申請。");
    } catch (cause) {
      setError(cause instanceof Error && cause.message.includes("status 400")
        ? "請檢查四項資料。生日不可晚於今天；電話請使用數字，可包含 +、空白、括號或連字號。"
        : "未能確認儲存結果，你的輸入已保留。請重新開啟個人檔案確認；若登入已過期，請重新登入。");
    } finally { clearTimeout(timeout); saveLock.current = false; setSaving(false); }
  }

  return <section className={styles.panel} aria-label="個人檔案編輯">
    <div className={styles.heading}><h2>基本資料</h2><span>僅供本人使用</span></div>
    <p className="muted">比賽測試請使用虛構資料。填寫或儲存不代表同意代填、送件或變更被照顧者資料。</p>
    {loading && <p role="status">正在載入個人檔案…</p>}
    {message && <p role="status" className={styles.success}>{message}</p>}
    {error && <div role="alert" className="error-message">{error} <Link href="/login">前往登入</Link></div>}
    {loadFailed && <button type="button" className="button secondary" onClick={() => {
      setLoading(true); setLoadFailed(false); setError(""); setRevision((value) => value + 1);
    }}>重新讀取</button>}
    <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={loading || loadFailed || saving} className={styles.fields}>
        <label htmlFor="profile-name">姓名<input id="profile-name" autoComplete="name" required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label htmlFor="profile-birth">出生日期<input id="profile-birth" type="date" autoComplete="bday" required min="1900-01-01" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} /></label>
        <label htmlFor="profile-area">居住地區<input id="profile-area" autoComplete="address-level2" required maxLength={100} placeholder="例如：臺北市大安區" value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} /></label>
        <label htmlFor="profile-phone">聯絡電話<input id="profile-phone" type="tel" autoComplete="tel" required minLength={6} maxLength={20} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
      </fieldset>
      <div className={styles.footer}><p>不提供修改登入身分證字號或密碼。</p><button className="button primary" disabled={loading || loadFailed || saving}>{saving ? "儲存中…" : "儲存個人檔案"}</button></div>
    </form>
  </section>;
}

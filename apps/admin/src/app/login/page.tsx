import Link from "next/link";

import { AdminLoginForm } from "./_components/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <main className="admin-login-page">
      <section className="admin-login-intro">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>照護個案管理</span></Link>
        <div>
          <p className="eyebrow">STAFF ACCESS ONLY</p>
          <h1>專員工作台</h1>
          <p>僅限 A 單位個案管理員登入，與家庭照顧者前台帳戶分開管理。</p>
        </div>
        <p className="login-note">沒有專員帳戶？請聯繫系統管理員建立帳號；此入口不提供公開註冊。</p>
      </section>
      <section className="admin-login-panel"><AdminLoginForm /></section>
    </main>
  );
}

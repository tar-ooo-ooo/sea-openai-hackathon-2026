import Link from "next/link";
import AuthForm from "./_components/AuthForm";

export default function LoginPage() {
  return <main className="auth-page">
    <section className="auth-story">
      <Link href="/" className="brand"><span className="brand-mark">伴</span>長照好伴</Link>
      <div><p className="eyebrow">有人陪你，一步一步來</p><h1>照顧家人的路上，<br />你不用一個人摸索。</h1>
        <p className="lead">從說說生活中的困難開始，<br />一起整理適合家人的照顧協助。</p>
        <ol className="story-steps"><li>說說目前的照顧情況</li><li>整理需求與可考慮的服務</li><li>確認下一步，準備尋求協助</li></ol>
      </div>
      <p className="small">申請前的需求整理工具，不代表政府已受理或核定。</p>
    </section>
    <section className="auth-panel"><AuthForm /><Link className="quiet-link" href="/">← 返回首頁</Link></section>
  </main>;
}

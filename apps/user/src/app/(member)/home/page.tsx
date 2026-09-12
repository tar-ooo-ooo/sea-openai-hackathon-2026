import Link from "next/link";

export default function MemberHome() {
  return <><p className="eyebrow">歡迎回來</p><h1>今天，想先了解什麼？</h1><p className="lead">照顧家人的大小事，可以慢慢說。</p><section className="welcome-panel"><div><p className="eyebrow">從需求開始</p><h2>一起整理家人需要的協助</h2><p>說說日常生活中需要幫忙的地方，讓照顧需求更清楚。</p><Link className="button primary" href="/chat">前往智慧小幫手 →</Link></div><span className="welcome-character" aria-hidden="true">伴</span></section><section className="member-section"><h2>你的照顧準備</h2><p className="muted">案件功能尚在串接中，目前不會顯示或建立示範案件。</p><Link className="quiet-link" href="/cases">查看我的案件 →</Link></section></>;
}

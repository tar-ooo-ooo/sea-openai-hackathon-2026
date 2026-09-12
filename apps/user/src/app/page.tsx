import Link from "next/link";

export default function Home() {
  return <div className="landing">
    <header className="public-header"><Link href="/" className="brand"><span className="brand-mark">伴</span>長照好伴</Link><Link className="button secondary" href="/login">登入 / 註冊</Link></header>
    <main className="landing-main"><section className="hero">
      <div><p className="eyebrow">給正在照顧家人的你</p><h1>照顧有疑問，<br />我們陪你理清。</h1><p className="lead">不知道從哪裡開始申請長照？<br />先說說家人的日常困難，一起找到下一步。</p><Link className="button primary" href="/login">開始尋求照顧協助 <span aria-hidden="true">→</span></Link><p className="small muted">登入後開始整理，方便下次繼續。</p></div>
      <aside className="intro-note"><p className="eyebrow">從生活裡的小事開始</p><h2>「媽媽最近洗澡，<br />都需要有人幫忙。」</h2><p>不必先了解服務名稱，也不用準備專業術語。你最熟悉的生活描述，就是整理需求的起點。</p><div className="note-footer">先了解需要，再準備申請。</div></aside>
    </section><section className="overview"><p className="eyebrow">接下來，我們一起</p><div className="overview-grid"><article><span>01</span><h2>說說照顧情況</h2><p>從最困擾你的事情開始，逐步補充需要的資訊。</p></article><article><span>02</span><h2>看懂需求整理</h2><p>確認家人的需求，以及可考慮的照顧服務。</p></article><article><span>03</span><h2>準備下一步</h2><p>整理詢問重點，向長照專線或專員尋求協助。</p></article></div></section></main>
    <footer className="public-footer">申請前準備工具，非政府申請平台；服務資格與內容仍須由照管中心評估。</footer>
  </div>;
}

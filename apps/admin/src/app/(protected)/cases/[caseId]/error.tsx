"use client";

import Link from "next/link";

export default function ApplicationError({ reset }: { reset: () => void }) {
  return <section className="content-section">
    <h1>暫時無法取得申請明細</h1>
    <p className="empty-state">請稍後重試；若登入已逾時，請重新登入專員帳號。</p>
    <button className="text-link" type="button" onClick={reset}>重新載入</button>
    <Link className="text-link" href="/">返回案件工作台</Link>
  </section>;
}

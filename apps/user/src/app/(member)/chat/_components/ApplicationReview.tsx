"use client";

import { useEffect, useRef } from "react";
import CasesPanel from "../../cases/_components/CasesPanel";
import styles from "./chat-panel.module.css";

export default function ApplicationReview({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); };
  }, []);

  return <dialog ref={dialog} className={styles.reviewDialog} aria-labelledby="application-review-title" onClose={() => {
    // Strict Mode effect 重啟會先 close 再 showModal；忽略該次排入佇列的 close。
    if (!dialog.current?.open) onClose();
  }}>
    <header className={styles.reviewHeader}>
      <div><p className={styles.reviewEyebrow}>申請前檢閱</p><h2 id="application-review-title">一起核對照顧需求</h2></div>
      <button type="button" className="button secondary" autoFocus onClick={() => dialog.current?.close()}>關閉</button>
    </header>
    <p className={styles.reviewIntro}>先核對照顧對象、日常需要的協助與服務建議。有不符的地方，可以關閉面板回到原對話補充。</p>
    <p className="muted">「已記錄」不代表你已確認。此處不顯示完整個資，也不是最終送件表單；代填功能仍在串接中。</p>
    <CasesPanel key={caseId} detail={{ id: caseId, kind: "case" }} onReturnToChat={() => dialog.current?.close()} />
  </dialog>;
}

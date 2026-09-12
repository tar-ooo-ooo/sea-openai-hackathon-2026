"use client";

import { useState } from "react";

type DemoActionButtonProps = {
  label: string;
};

export function DemoActionButton({ label }: DemoActionButtonProps) {
  const [hasBeenPressed, setHasBeenPressed] = useState(false);

  return (
    <div className="demo-action">
      <button onClick={() => setHasBeenPressed(true)} type="button">{label}</button>
      {hasBeenPressed ? <p role="status">Demo 操作已顯示；尚未寫入資料庫。</p> : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { fetchApi } from "@/lib/fetch-api";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetchApi("/api/admin-auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return <button className="logout-button" disabled={busy} onClick={handleLogout} type="button">登出</button>;
}

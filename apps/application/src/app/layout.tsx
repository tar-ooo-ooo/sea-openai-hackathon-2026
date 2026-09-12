import type { Metadata } from "next";
import type { ReactNode } from "react";

import GovernmentShell from "../components/GovernmentShell";
import "../styles.css";
import "../portal-home.css";
import "../government-forms.css";
import "../government-shell.css";

export const metadata: Metadata = {
  title: "長期照顧服務線上申辦",
  description: "長期照顧服務線上申請、補件、評估排程與案件進度查詢。",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        <GovernmentShell>{children}</GovernmentShell>
      </body>
    </html>
  );
}

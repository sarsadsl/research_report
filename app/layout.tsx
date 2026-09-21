import type { Metadata } from "next";
import { ResearchMasthead } from "./research/components/research-notebook";
import { ResearchRouteEffects } from "./research/research-client";
import "./globals.css";
import "./research/research-notebook.css";

export const metadata: Metadata = {
  title: "Research Desk｜個股研究資料庫",
  description: "以研究檔案、驗證鏈與財務訊號持續整理個股研究。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-TW">
      <body>
        <a className="skipLink" href="#main-content">跳至主要內容</a>
        <ResearchMasthead />
        {children}
        <ResearchRouteEffects />
      </body>
    </html>
  );
}

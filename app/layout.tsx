import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "個股研究資料庫",
  description: "個股研究、財務實績、預估情境、催化劑、風險與紅綠燈追蹤。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-TW">
      <body>
        <header className="siteHeader">
          <div className="shell navInner">
            <Link href="/research" className="brand">Research DB</Link>
            <nav><Link href="/research">個股研究</Link></nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

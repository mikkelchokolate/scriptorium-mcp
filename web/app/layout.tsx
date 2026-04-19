import "./globals.css";
import type { Metadata } from "next";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Scriptorium Graph Explorer",
  description: "Visual graph explorer for Scriptorium MCP projects.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={DEFAULT_APP_LOCALE}>
      <body>
        <div className="shell">{children}</div>
      </body>
    </html>
  );
}

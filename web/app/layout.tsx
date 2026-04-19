import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scriptorium Graph Explorer",
  description: "Visual graph explorer for Scriptorium MCP projects.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">{children}</div>
      </body>
    </html>
  );
}

import "./globals.css";
import type { Metadata } from "next";
import { Cormorant_Garamond, IBM_Plex_Mono, Manrope } from "next/font/google";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n";

const displayFont = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const sansFont = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Scriptorium Graph Explorer",
  description: "Visual graph explorer for Scriptorium MCP projects.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={DEFAULT_APP_LOCALE}>
      <body className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable}`}>
        <div className="shell">{children}</div>
      </body>
    </html>
  );
}

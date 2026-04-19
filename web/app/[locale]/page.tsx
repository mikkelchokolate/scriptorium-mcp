import { notFound } from "next/navigation";

import { HomePage } from "@/components/home-page";
import { isSupportedLocale } from "@/lib/i18n";

export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }

  return <HomePage locale={locale} />;
}

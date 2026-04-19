import { notFound } from "next/navigation";

import { GraphExplorer } from "@/components/graph-explorer";
import { isSupportedLocale } from "@/lib/i18n";

export default async function ProjectGraphPage({
  params,
}: {
  params: Promise<{ locale: string; project: string }>;
}) {
  const { locale, project } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }

  return <GraphExplorer locale={locale} project={project} />;
}

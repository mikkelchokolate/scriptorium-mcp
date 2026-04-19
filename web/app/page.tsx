import { redirect } from "next/navigation";
import { DEFAULT_APP_LOCALE } from "@/lib/i18n";

export default function Page() {
  redirect(`/${DEFAULT_APP_LOCALE}`);
}

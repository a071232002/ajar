import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile-data";

export const dynamic = "force-dynamic";

/** 根路徑不承載內容，導到使用者的主要語言 */
export default async function RootPage() {
  const profile = await getProfile();
  redirect(`/${profile?.primary_lang ?? "en"}`);
}

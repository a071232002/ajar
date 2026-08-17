import TopNav from "@/components/TopNav";
import { getProfile } from "@/lib/profile-data";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 啟用了幾種語言決定要不要顯示切換器，所以 layout 需要讀 profile
  const profile = await getProfile();

  return (
    <>
      <TopNav langs={profile?.langs ?? ["en"]} />
      {/* 內容欄置中；手機預留底部雙鍵高度 */}
      <main className="mx-auto w-full max-w-[760px] px-4 pb-24 pt-8 sm:px-6 sm:pb-16">
        {children}
      </main>
    </>
  );
}

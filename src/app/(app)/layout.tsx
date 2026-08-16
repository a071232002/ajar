import TopNav from "@/components/TopNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      {/* 內容欄置中；手機預留底部雙鍵高度 */}
      <main className="mx-auto w-full max-w-[760px] px-4 pb-24 pt-8 sm:px-6 sm:pb-16">
        {children}
      </main>
    </>
  );
}

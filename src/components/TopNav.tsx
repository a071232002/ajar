"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const ITEMS = [
  { href: "/", label: "今日" },
  { href: "/calendar", label: "行事曆" },
] as const;

export default function TopNav() {
  const pathname = usePathname();

  const linkCls = (href: string) =>
    `px-1 py-1 text-[15px] ${
      pathname === href ? "font-medium text-ink" : "text-soft hover:text-ink"
    }`;

  return (
    <>
      <header className="sticky top-0 z-10 h-14 border-b border-folder-deep/50 bg-desk">
        <div className="mx-auto flex h-full max-w-[960px] items-center justify-between px-5">
          <Link href="/" className="font-hand text-2xl font-semibold">
            ajar
          </Link>

          <nav className="hidden items-center gap-6 sm:flex" aria-label="主選單">
            {ITEMS.map((it) => (
              <Link key={it.href} href={it.href} className={linkCls(it.href)}>
                {it.label}
              </Link>
            ))}
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button className="text-[15px] text-soft hover:text-ink">⎋ 登出</button>
            </form>
          </nav>

          <nav className="flex items-center gap-3 sm:hidden" aria-label="更多">
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button className="text-[15px] text-soft">⎋</button>
            </form>
          </nav>
        </div>
      </header>

      {/* 手機底部固定雙鍵：今日 / 行事曆 */}
      <nav
        aria-label="快速導覽"
        className="fixed inset-x-0 bottom-0 z-10 flex h-14 border-t border-folder-deep/50 bg-desk sm:hidden"
      >
        {ITEMS.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex w-1/2 items-center justify-center text-sm ${
              pathname === it.href ? "font-medium text-ink" : "text-soft"
            }`}
          >
            {it.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

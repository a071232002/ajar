"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavLink from "@/components/NavLink";
import ThemeToggle from "@/components/ThemeToggle";
import { LANG_TAG, LANG_ZH, isLang, type Lang } from "@/lib/lang";

export default function TopNav({ langs }: { langs: Lang[] }) {
  const pathname = usePathname();

  // 網址第一段就是語言；設定頁等語言中立的頁面沒有這一段
  const seg = pathname.split("/")[1];
  const active: Lang | null = isLang(seg) ? seg : null;
  const base = active ? `/${active}` : `/${langs[0] ?? "en"}`;

  const items = [
    { href: base, label: "今日" },
    { href: `${base}/calendar`, label: "行事曆" },
    { href: "/settings", label: "設定" },
  ];

  const linkCls = (href: string) =>
    `nav-link px-1 py-1 text-[15px] ${
      pathname === href ? "font-medium text-ink" : "text-soft hover:text-ink"
    }`;

  /** 換語言時停在同一種頁面（今日↔今日、行事曆↔行事曆），不要每次彈回首頁 */
  const swapLang = (to: Lang) => {
    if (!active) return `/${to}`;
    const rest = pathname.split("/").slice(2).join("/");
    // 特定某天的卡片換語言未必存在，退回該語言的今日
    return rest.startsWith("lesson/") ? `/${to}` : `/${to}${rest ? `/${rest}` : ""}`;
  };

  const langSwitch =
    langs.length > 1 ? (
      <div className="langsw" role="group" aria-label="切換語言">
        {langs.map((l) => (
          <Link
            key={l}
            href={swapLang(l)}
            aria-current={l === active ? "true" : undefined}
            title={LANG_ZH[l]}
            className={`langsw-item lang-${l}`}
          >
            {LANG_TAG[l]}
          </Link>
        ))}
      </div>
    ) : null;

  return (
    <>
      <header className="sticky top-0 z-10 h-14 border-b border-folder-deep/50 bg-desk">
        <div className="mx-auto flex h-full max-w-[960px] items-center justify-between px-5">
          <Link href={base} className="font-hand text-2xl font-semibold">
            ajar
          </Link>

          <nav className="hidden items-center gap-5 sm:flex" aria-label="主選單">
            {langSwitch}
            {items.map((it) => (
              <NavLink key={it.href} href={it.href} className={linkCls(it.href)}>
                {it.label}
              </NavLink>
            ))}
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button className="text-[15px] text-soft hover:text-ink">⎋ 登出</button>
            </form>
          </nav>

          <nav className="flex items-center gap-3 sm:hidden" aria-label="更多">
            {langSwitch}
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button className="text-[15px] text-soft">⎋</button>
            </form>
          </nav>
        </div>
      </header>

      {/* 手機底部固定：今日 / 行事曆 / 設定 */}
      <nav
        aria-label="快速導覽"
        className="fixed inset-x-0 bottom-0 z-10 flex h-14 border-t border-folder-deep/50 bg-desk sm:hidden"
      >
        {items.map((it) => (
          <NavLink
            key={it.href}
            href={it.href}
            className={`nav-link flex w-1/3 items-center justify-center text-sm ${
              pathname === it.href ? "font-medium text-ink" : "text-soft"
            }`}
          >
            {it.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

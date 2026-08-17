"use client";

import Link, { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

/**
 * 導覽連結 + 讀取中指示。
 * 頁面是 server component，點下去要等伺服器算完才換頁；沒有這個的話畫面完全不動，
 * 分不出「沒點到」還是「在等」。useLinkStatus 只在該連結的導覽進行中為 true。
 */
function Pending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span className="nav-spinner" aria-hidden />;
}

export default function NavLink({
  href,
  className,
  children,
  ...rest
}: {
  href: string;
  className?: string;
  children: ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link href={href} className={className} {...rest}>
      {children}
      <Pending />
    </Link>
  );
}

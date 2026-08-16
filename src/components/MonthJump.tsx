"use client";

import { useRouter } from "next/navigation";

/** 行事曆上方的年/月選擇：選了就跳到該月第一週 */
export default function MonthJump({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const years = [year - 1, year, year + 1].filter((v, i, a) => a.indexOf(v) === i);

  function jump(y: number, m: number) {
    router.push(`/calendar?d=${y}-${String(m).padStart(2, "0")}-01`);
  }

  return (
    <span className="flex items-center gap-1.5">
      <select
        aria-label="年"
        value={year}
        onChange={(e) => jump(Number(e.target.value), month)}
        className="rounded border border-soft/50 bg-paper px-2 py-1 text-sm text-ink"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y} 年</option>
        ))}
      </select>
      <select
        aria-label="月"
        value={month}
        onChange={(e) => jump(year, Number(e.target.value))}
        className="rounded border border-soft/50 bg-paper px-2 py-1 text-sm text-ink"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>{m} 月</option>
        ))}
      </select>
    </span>
  );
}

import Link from "next/link";
import MonthJump from "@/components/MonthJump";
import { addDays, mondayOf, taipeiToday, weekMonth } from "@/lib/date";
import { getWeek } from "@/lib/lesson-data";

export const dynamic = "force-dynamic";

const DOW = ["一", "二", "三", "四", "五", "六", "日"];

/**
 * 行事曆（週檢視）：一週七列、主題標題完整可讀。
 * 上方選年月；‹ › 切前後週——週序跨到月底自然接到下個月。
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  const today = taipeiToday();
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(d ?? "") ? d! : today;
  const monday = mondayOf(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  // 跨月的那一週看星期四算哪個月，否則選 9 月會看到標示 8 月的畫面
  const { year, month } = weekMonth(monday);

  const { lessons, plans } = await getWeek(days[0], days[6]);

  const lessonBy = new Map(lessons.map((l) => [l.lesson_date, l] as const));
  const planBy = new Map(plans.map((p) => [p.plan_date, p] as const));

  return (
    <div className="mx-auto max-w-[700px]" data-testid="calendar">
      <div className="sheet animate-sheet-in">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link
            href={`/calendar?d=${addDays(monday, -7)}`}
            aria-label="上一週"
            className="rounded border border-soft/50 bg-paper px-3 py-1 text-sm text-soft hover:text-ink"
          >
            ‹ 上週
          </Link>
          <MonthJump year={year} month={month} />
          <Link
            href={`/calendar?d=${addDays(monday, 7)}`}
            aria-label="下一週"
            className="rounded border border-soft/50 bg-paper px-3 py-1 text-sm text-soft hover:text-ink"
          >
            下週 ›
          </Link>
        </div>

        {/* 跨月的那一週，光看月份選單看不出實際範圍 */}
        <p className="mb-3 text-center font-mono text-[12.5px] text-soft">
          {days[0].replace(/-/g, "/")} — {days[6].replace(/-/g, "/")}
        </p>

        <ul>
          {days.map((date, i) => {
            const lesson = lessonBy.get(date);
            const plan = planBy.get(date);
            const isToday = date === today;
            const isFuture = date > today;

            const dateCol = (
              <span className="w-20 flex-none font-mono text-[13px] text-soft">
                {date.slice(5).replace("-", "/")}
                <span className="ml-1.5">{DOW[i]}</span>
              </span>
            );

            const status = lesson ? (
              <span
                className={`w-12 flex-none text-right font-mono text-[13px] ${
                  lesson.read_at ? "text-accent" : "text-soft"
                }`}
              >
                {lesson.read_at ? "✓ 已讀" : "— 未讀"}
              </span>
            ) : plan ? (
              <span className="w-12 flex-none text-right font-mono text-[13px] text-clip">
                ◌ 預排
              </span>
            ) : (
              <span className="w-12 flex-none" />
            );

            const rowCls = `flex items-center gap-3 border-b border-folder-deep/30 px-2 py-3 ${
              isToday ? "bg-hl/30" : ""
            }`;

            return (
              <li key={date}>
                {lesson ? (
                  <Link href={`/lesson/${date}`} className={`${rowCls} hover:bg-hl/20`}>
                    {dateCol}
                    <span className="min-w-0 flex-1 truncate text-[15px]">
                      {lesson.theme_zh}
                    </span>
                    {status}
                  </Link>
                ) : (
                  <div className={rowCls}>
                    {dateCol}
                    <span
                      className={`min-w-0 flex-1 truncate text-[15px] ${
                        plan ? (isFuture ? "italic text-soft" : "text-soft") : "text-soft/40"
                      }`}
                    >
                      {plan?.title_zh ?? (isFuture ? "" : "—")}
                    </span>
                    {status}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-[13px] text-soft">
          ✓ 已讀 · — 有卡未讀 · ◌ 預排主題（未來） · 點列進當天卡片
        </p>
      </div>
    </div>
  );
}

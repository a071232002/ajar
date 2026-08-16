import Link from "next/link";
import MonthJump from "@/components/MonthJump";
import { addDays, taipeiToday } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DOW = ["一", "二", "三", "四", "五", "六", "日"];

/** 取該日期所屬週的星期一 */
function mondayOf(date: string): string {
  const dow = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(date, -dow);
}

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
  const [year, month] = [Number(monday.slice(0, 4)), Number(monday.slice(5, 7))];

  const supabase = await createClient();
  const [{ data: lessons }, { data: plans }] = await Promise.all([
    supabase
      .from("daily_lessons")
      .select("lesson_date, theme_zh, read_at")
      .gte("lesson_date", days[0])
      .lte("lesson_date", days[6]),
    supabase
      .from("theme_plan")
      .select("plan_date, title_zh")
      .eq("status", "planned")
      .gte("plan_date", days[0])
      .lte("plan_date", days[6]),
  ]);

  const lessonBy = new Map(
    (lessons ?? []).map((l) => [l.lesson_date, l] as const),
  );
  const planBy = new Map((plans ?? []).map((p) => [p.plan_date, p] as const));

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

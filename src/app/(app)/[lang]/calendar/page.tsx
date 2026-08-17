import Link from "next/link";
import { notFound } from "next/navigation";
import DayEditor from "@/components/DayEditor";
import FocusBlockForm from "@/components/FocusBlockForm";
import MonthJump from "@/components/MonthJump";
import { categoryZh } from "@/lib/categories";
import { addDays, firstWeekOfMonth, mondayOf, taipeiToday, weekMonth } from "@/lib/date";
import { LANG_TAG, isLang } from "@/lib/lang";
import { getWeek } from "@/lib/lesson-data";
import { getFocusBlocks, getProfile, getTopics } from "@/lib/profile-data";

export const dynamic = "force-dynamic";

const DOW = ["一", "二", "三", "四", "五", "六", "日"];

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ d?: string; y?: string; m?: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const { d, y, m } = await searchParams;

  const profile = await getProfile();
  if (!profile) notFound();

  const today = taipeiToday();
  // 月份選單走原生 GET 表單，帶的是 y/m；上下週切換帶的是 d
  const ym =
    y && m && Number(y) > 1970 && Number(m) >= 1 && Number(m) <= 12
      ? firstWeekOfMonth(Number(y), Number(m))
      : null;
  const anchor = ym ?? (/^\d{4}-\d{2}-\d{2}$/.test(d ?? "") ? d! : today);
  const monday = mondayOf(anchor);
  const back = `/${lang}/calendar?d=${anchor}`;
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  // 跨月的那一週看星期四算哪個月，否則選 9 月會看到標示 8 月的畫面
  const { year, month } = weekMonth(monday);

  const [{ lessons, plans }, topics, blocks] = await Promise.all([
    getWeek(profile.id, lang, days[0], days[6]),
    getTopics(),
    getFocusBlocks(lang, days[0], days[6]),
  ]);

  const lessonBy = new Map(lessons.map((l) => [l.lesson_date, l] as const));
  const planBy = new Map(plans.map((p) => [p.plan_date, p] as const));
  const picked = topics.filter((t) => t.picked);

  /** 這一天落在哪個集中期裡 */
  const blockOn = (date: string) =>
    blocks.find((b) => b.starts_on <= date && date <= b.ends_on);

  return (
    <div className="mx-auto max-w-[700px]" data-testid="calendar">
      <div className="sheet animate-sheet-in">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link
            href={`/${lang}/calendar?d=${addDays(monday, -7)}`}
            aria-label="上一週"
            className="rounded border border-soft/50 bg-paper px-3 py-1 text-sm text-soft hover:text-ink"
          >
            ‹ 上週
          </Link>
          <MonthJump lang={lang} year={year} month={month} />
          <Link
            href={`/${lang}/calendar?d=${addDays(monday, 7)}`}
            aria-label="下一週"
            className="rounded border border-soft/50 bg-paper px-3 py-1 text-sm text-soft hover:text-ink"
          >
            下週 ›
          </Link>
        </div>

        {/* 跨月的那一週，光看月份選單看不出實際範圍 */}
        <p className="mb-3 text-center font-mono text-[12.5px] text-soft">
          <span className={`lang-tag lang-${lang}`}>{LANG_TAG[lang]}</span>
          {days[0].replace(/-/g, "/")} — {days[6].replace(/-/g, "/")}
        </p>

        <ul>
          {days.map((date, i) => {
            const lesson = lessonBy.get(date);
            const plan = planBy.get(date);
            const block = blockOn(date);
            const isToday = date === today;
            const isFuture = date > today;

            // 主題優先於標題：先看「今天在練什麼」，具體題目是次要資訊
            const topicName =
              lesson?.topics?.title_zh ??
              plan?.topics?.title_zh ??
              block?.topics?.title_zh ??
              null;
            const detail = lesson?.theme_zh ?? plan?.title_zh ?? null;

            return (
              <li
                key={date}
                className={`border-b border-folder-deep/30 px-2 py-2.5 ${
                  isToday ? "bg-hl/30" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-20 flex-none pt-0.5 font-mono text-[13px] text-soft">
                    {date.slice(5).replace("-", "/")}
                    <span className="ml-1.5">{DOW[i]}</span>
                  </span>

                  <div className="min-w-0 flex-1">
                    {topicName ? (
                      <p className="truncate text-[15px] font-medium">{topicName}</p>
                    ) : (
                      <p className="text-[15px] text-soft/50">—</p>
                    )}
                    {detail && (
                      <p className="truncate text-[13px] text-soft">
                        {lesson ? (
                          <Link href={`/${lang}/lesson/${date}`} className="hover:text-ink">
                            {detail}
                          </Link>
                        ) : (
                          detail
                        )}
                      </p>
                    )}
                  </div>

                  <span className="w-12 flex-none pt-0.5 text-right font-mono text-[13px]">
                    {lesson ? (
                      <span className={lesson.read_at ? "text-accent" : "text-soft"}>
                        {lesson.read_at ? "✓ 已讀" : "— 未讀"}
                      </span>
                    ) : plan ? (
                      <span className={plan.source === "user" ? "text-accent" : "text-clip"}>
                        {plan.source === "user" ? "◉ 指定" : "◌ 預排"}
                      </span>
                    ) : null}
                  </span>
                </div>

                {/* 未來的日子可以編輯 */}
                {isFuture && (
                  <DayEditor
                    lang={lang}
                    date={date}
                    topics={picked}
                    current={plan ? { title_zh: plan.title_zh, source: plan.source } : null}
                  />
                )}
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-[13px] text-soft">
          ✓ 已讀 · — 有卡未讀 · ◌ 系統預排 · ◉ 你指定的（排程不會覆蓋）
        </p>
      </div>

      <FocusBlockForm lang={lang} topics={picked} blocks={blocks} today={today} back={back} />
    </div>
  );
}

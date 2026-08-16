import { getOrPromoteActiveChapter, LESSONS_PER_CHAPTER } from "@/lib/chapters";
import { addDays, taipeiToday } from "@/lib/date";
import { WRITING_RULES } from "@/lib/lesson-schema";
import { isAuthorizedMachine, unauthorized } from "@/lib/machine-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * routine 生成前呼叫：今日狀態、當前章節、今日/未來預排、
 * 全站已用主題、近 14 天詞彙。
 */
export async function GET(request: Request) {
  if (!isAuthorizedMachine(request)) return unauthorized();

  const db = createAdminClient();
  const today = taipeiToday();

  const [
    { data: todayLesson },
    chapter,
    { data: themes },
    { data: recent },
    { data: plans },
  ] = await Promise.all([
    db.from("daily_lessons").select("id").eq("lesson_date", today).maybeSingle(),
    getOrPromoteActiveChapter(db),
    db.from("daily_lessons").select("theme_en"),
    db
      .from("vocab_items")
      .select("word, daily_lessons!inner(lesson_date)")
      .gte("daily_lessons.lesson_date", addDays(today, -14)),
    db
      .from("theme_plan")
      .select("plan_date, chapter_id, title_en, title_zh")
      .eq("status", "planned")
      .gte("plan_date", today)
      .order("plan_date"),
  ]);

  let lessonsDoneInChapter = 0;
  if (chapter) {
    const { count } = await db
      .from("daily_lessons")
      .select("*", { count: "exact", head: true })
      .eq("chapter_id", chapter.id);
    lessonsDoneInChapter = count ?? 0;
  }

  const planned = plans ?? [];
  const todayPlan = planned.find((p) => p.plan_date === today) ?? null;
  const plannedDates = new Set(planned.map((p) => p.plan_date));
  // 未來 7 天中尚未預排的日期——routine 應先補足這些再生成今日卡片
  const missingPlanDates = Array.from({ length: 7 }, (_, i) =>
    addDays(today, i + 1),
  ).filter((d) => !plannedDates.has(d));

  return Response.json({
    today,
    writing_rules: WRITING_RULES,
    today_exists: todayLesson !== null,
    chapter: chapter
      ? {
          id: chapter.id,
          title_en: chapter.title_en,
          title_zh: chapter.title_zh,
          category: chapter.category,
          lessons_done_in_chapter: lessonsDoneInChapter,
          lessons_per_chapter: LESSONS_PER_CHAPTER,
        }
      : null,
    no_pending_chapters: chapter === null,
    today_plan: todayPlan,
    upcoming_plans: planned.filter((p) => p.plan_date > today),
    missing_plan_dates: missingPlanDates,
    used_themes: [
      ...(themes ?? []).map((t) => t.theme_en),
      ...planned.map((p) => p.title_en),
    ],
    recent_words: (recent ?? []).map((w) => w.word),
  });
}

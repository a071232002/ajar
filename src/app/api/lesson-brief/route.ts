import { addDays, taipeiToday } from "@/lib/date";
import { WRITING_RULES } from "@/lib/lesson-schema";
import { isAuthorizedMachine, unauthorized } from "@/lib/machine-auth";
import { resolveOwner } from "@/lib/machine-user";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const dayDiff = (a: string, b: string) =>
  Math.round(
    (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000,
  );

/**
 * routine 生成前呼叫：今日狀態、集中期、預排、已用主題、近期詞彙。
 * 依 ?lang= 與 ?user_id= 分開回報——每個使用者每種語言各一張卡。
 */
export async function GET(request: Request) {
  if (!isAuthorizedMachine(request)) return unauthorized();

  const db = createAdminClient();
  const today = taipeiToday();

  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") === "ja" ? "ja" : "en";
  const owner = await resolveOwner(db, url.searchParams.get("user_id") ?? undefined);
  if ("error" in owner) return Response.json({ error: owner.error }, { status: 400 });
  const uid = owner.userId;

  const horizon = addDays(today, 7);

  const [
    { data: todayLesson },
    { data: profile },
    { data: themes },
    { data: recent },
    { data: plans },
    { data: blocks },
    { data: picks },
  ] = await Promise.all([
    db
      .from("daily_lessons")
      .select("id")
      .eq("user_id", uid)
      .eq("lang", lang)
      .eq("lesson_date", today)
      .maybeSingle(),
    db
      .from("profiles")
      .select("background_zh, langs, primary_lang")
      .eq("id", uid)
      .maybeSingle(),
    db.from("daily_lessons").select("theme_en").eq("user_id", uid).eq("lang", lang),
    db
      .from("vocab_items")
      .select("word, daily_lessons!inner(lesson_date, user_id, lang)")
      .eq("daily_lessons.user_id", uid)
      .eq("daily_lessons.lang", lang)
      .gte("daily_lessons.lesson_date", addDays(today, -14)),
    db
      .from("theme_plan")
      .select("plan_date, title_en, title_zh, source, topic_id, topics(title_zh, category)")
      .eq("user_id", uid)
      .eq("lang", lang)
      .eq("status", "planned")
      .gte("plan_date", today)
      .order("plan_date"),
    db
      .from("focus_blocks")
      .select(
        "id, starts_on, ends_on, source, topic_id, topics(title_zh, category, axis_hint_zh)",
      )
      .eq("user_id", uid)
      .eq("lang", lang)
      .lte("starts_on", horizon)
      .gte("ends_on", today)
      .order("starts_on"),
    db
      .from("user_topics")
      .select("topic_id, topics(id, title_zh, category, axis_hint_zh)")
      .eq("user_id", uid),
  ]);

  const planned = plans ?? [];
  const todayPlan = planned.find((p) => p.plan_date === today) ?? null;
  const plannedDates = new Set(planned.map((p) => p.plan_date));
  const missingPlanDates = Array.from({ length: 7 }, (_, i) =>
    addDays(today, i + 1),
  ).filter((d) => !plannedDates.has(d));

  const active =
    (blocks ?? []).find((b) => b.starts_on <= today && today <= b.ends_on) ?? null;

  return Response.json({
    today,
    lang,
    user_id: uid,
    writing_rules: WRITING_RULES,
    today_exists: todayLesson !== null,

    /** 個人化素材，不綁語言 */
    background_zh: profile?.background_zh ?? null,
    enabled_langs: profile?.langs ?? ["en"],

    /**
     * 選題優先序，由高到低：
     *   1. today_plan.source === 'user'  使用者指定，不得更動
     *   2. active_focus_block            從該主題出題，難度依 day_in_block 遞進
     *   3. today_plan.source === 'auto'  系統先前排好的
     *   4. picked_topics                 挑一個沒練過的，並補一段新的集中期
     */
    today_plan: todayPlan,
    active_focus_block: active
      ? {
          ...active,
          day_in_block: dayDiff(today, active.starts_on) + 1,
          total_days: dayDiff(active.ends_on, active.starts_on) + 1,
        }
      : null,
    upcoming_focus_blocks: (blocks ?? []).filter((b) => b.starts_on > today),
    picked_topics: (picks ?? []).map((p) => p.topics).filter(Boolean),

    upcoming_plans: planned.filter((p) => p.plan_date > today),
    /** 只填空的日子 */
    missing_plan_dates: missingPlanDates,
    /** 這些日子是使用者自己排的，排程不得覆蓋 */
    user_locked_dates: planned.filter((p) => p.source === "user").map((p) => p.plan_date),

    used_themes: [
      ...(themes ?? []).map((t) => t.theme_en),
      ...planned.map((p) => p.title_en),
    ],
    recent_words: (recent ?? []).map((w) => w.word),
  });
}

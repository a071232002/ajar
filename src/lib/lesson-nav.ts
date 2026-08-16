import type { SupabaseClient } from "@supabase/supabase-js";

/** 取當前日期前後最近的卡片日期（供「前一張／後一張」切換） */
export async function neighborLessonDates(
  db: SupabaseClient,
  date: string,
): Promise<{ prevDate: string | null; nextDate: string | null }> {
  const [{ data: prev }, { data: next }] = await Promise.all([
    db
      .from("daily_lessons")
      .select("lesson_date")
      .lt("lesson_date", date)
      .order("lesson_date", { ascending: false })
      .limit(1)
      .maybeSingle<{ lesson_date: string }>(),
    db
      .from("daily_lessons")
      .select("lesson_date")
      .gt("lesson_date", date)
      .order("lesson_date", { ascending: true })
      .limit(1)
      .maybeSingle<{ lesson_date: string }>(),
  ]);
  return { prevDate: prev?.lesson_date ?? null, nextDate: next?.lesson_date ?? null };
}

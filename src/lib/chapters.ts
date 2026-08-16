import type { SupabaseClient } from "@supabase/supabase-js";

export const LESSONS_PER_CHAPTER = 7;

export type Chapter = {
  id: string;
  sort_order: number;
  title_en: string;
  title_zh: string;
  category: string; // 自由文字：interview / work / life / 未來任意新增
  status: "pending" | "active" | "done";
};

/** 取得目前 active 章節；沒有 active 時把 sort_order 最小的 pending 升為 active */
export async function getOrPromoteActiveChapter(
  db: SupabaseClient,
): Promise<Chapter | null> {
  const { data: active } = await db
    .from("chapters")
    .select("*")
    .eq("status", "active")
    .order("sort_order")
    .limit(1)
    .maybeSingle<Chapter>();
  if (active) return active;

  const { data: pending } = await db
    .from("chapters")
    .select("*")
    .eq("status", "pending")
    .order("sort_order")
    .limit(1)
    .maybeSingle<Chapter>();
  if (!pending) return null;

  await db.from("chapters").update({ status: "active" }).eq("id", pending.id);
  return { ...pending, status: "active" };
}

/** 章節內課數達標時：標 done 並升下一章 */
export async function advanceChapterIfComplete(
  db: SupabaseClient,
  chapterId: string,
): Promise<void> {
  const { count } = await db
    .from("daily_lessons")
    .select("*", { count: "exact", head: true })
    .eq("chapter_id", chapterId);

  if ((count ?? 0) >= LESSONS_PER_CHAPTER) {
    await db.from("chapters").update({ status: "done" }).eq("id", chapterId);
    await getOrPromoteActiveChapter(db);
  }
}

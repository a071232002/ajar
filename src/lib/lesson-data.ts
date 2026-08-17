import { unstable_cache } from "next/cache";
import type { LessonContent } from "@/lib/lesson-schema";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 讀取路徑的快取層。
 *
 * 為什麼值得做：實測同區域每個 Supabase 查詢仍要約 70ms——不是查詢慢（直連只要
 * 5ms），是每次呼叫各自開一條 HTTPS 連線的握手成本。一頁 4～6 個查詢就疊到
 * 400ms 以上。快取命中時這些全部歸零。
 *
 * 為什麼可以做：卡片寫進去之後內容就不再變（只有 read_at 會動），預排也是低頻寫入。
 * 所有寫入端都會 revalidateTag，所以不會讀到舊資料。
 *
 * 用 admin client：快取是跨請求共用的，不能綁到某個使用者的 session。
 * 這裡讀的都不是機敏資料，而且頁面本身已經被 middleware 擋在登入後面。
 */
export const TAG_LESSONS = "lessons";
export const TAG_PLANS = "plans";

const DAY = 86_400;

export type LessonRecord = {
  id: string;
  lesson_date: string;
  theme_en: string;
  theme_zh: string;
  content: LessonContent;
  read_at: string | null;
  chapters: { category: string } | null;
};

/** 某天的卡片（含章節分類）。找不到回 null。 */
export const getLesson = unstable_cache(
  async (userId: string, lang: string, date: string): Promise<LessonRecord | null> => {
    const db = createAdminClient();
    const { data } = await db
      .from("daily_lessons")
      .select("id, lesson_date, theme_en, theme_zh, content, read_at, chapters(category)")
      .eq("user_id", userId).eq("lang", lang).eq("lesson_date", date)
      .maybeSingle<LessonRecord>();
    return data ?? null;
  },
  ["lesson-by-date"],
  { tags: [TAG_LESSONS], revalidate: DAY },
);

/** 前後最近一張卡的日期（供左右切換） */
export const getNeighborDates = unstable_cache(
  async (userId: string, lang: string, date: string): Promise<{ prevDate: string | null; nextDate: string | null }> => {
    const db = createAdminClient();
    const [{ data: prev }, { data: next }] = await Promise.all([
      db
        .from("daily_lessons")
        .select("lesson_date")
        .eq("user_id", userId).eq("lang", lang).lt("lesson_date", date)
        .order("lesson_date", { ascending: false })
        .limit(1)
        .maybeSingle<{ lesson_date: string }>(),
      db
        .from("daily_lessons")
        .select("lesson_date")
        .eq("user_id", userId).eq("lang", lang).gt("lesson_date", date)
        .order("lesson_date", { ascending: true })
        .limit(1)
        .maybeSingle<{ lesson_date: string }>(),
    ]);
    return { prevDate: prev?.lesson_date ?? null, nextDate: next?.lesson_date ?? null };
  },
  ["lesson-neighbors"],
  { tags: [TAG_LESSONS], revalidate: DAY },
);

/** 全站第一張卡的日期，用來算 DAY N。只有第一次寫入時會變。 */
export const getFirstLessonDate = unstable_cache(
  async (userId: string, lang: string): Promise<string | null> => {
    const db = createAdminClient();
    const { data } = await db
      .from("daily_lessons")
      .select("lesson_date")
      .eq("user_id", userId)
      .eq("lang", lang)
      .order("lesson_date", { ascending: true })
      .limit(1)
      .maybeSingle<{ lesson_date: string }>();
    return data?.lesson_date ?? null;
  },
  ["first-lesson-date"],
  { tags: [TAG_LESSONS], revalidate: DAY },
);

/** 這張卡的音檔：clip_key → 公開 URL。音檔由排程補，補完會 revalidate。 */
export const getAudioUrls = unstable_cache(
  async (lessonId: string): Promise<Record<string, string>> => {
    const db = createAdminClient();
    const { data } = await db
      .from("lesson_audio")
      .select("clip_key, path")
      .eq("lesson_id", lessonId);

    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      map[row.clip_key] = db.storage.from("lesson-audio").getPublicUrl(row.path)
        .data.publicUrl;
    }
    return map;
  },
  ["lesson-audio"],
  // 短 TTL：音檔由 GitHub Actions 於 05:30 直連 Supabase 補上，不經過本站的寫入端，
  // 沒有人會來 revalidate。若在 05:00–05:30 之間開過網站，空清單會被鎖一整天。
  { tags: [TAG_LESSONS], revalidate: 120 },
);

type TopicRef = { title_zh: string; category: string } | null;

export type WeekRow = {
  lessons: {
    lesson_date: string; theme_zh: string; read_at: string | null;
    topic_id: string | null; topics: TopicRef;
  }[];
  plans: {
    plan_date: string; title_zh: string; source: string;
    topic_id: string | null; topics: TopicRef;
  }[];
};

/**
 * 一整週的卡片與預排。
 * 這一支刻意不快取：行事曆是使用者會即時編輯的頁面（指定某天、排集中期），
 * 快取只會讓剛存的東西看不到。值得快取的是不會變的卡片內容，不是這個。
 */
export async function getWeek(
  userId: string,
  lang: string,
  from: string,
  to: string,
): Promise<WeekRow> {
    const db = createAdminClient();
    const [{ data: lessons }, { data: plans }] = await Promise.all([
      db
        .from("daily_lessons")
        .select("lesson_date, theme_zh, read_at, topic_id, topics(title_zh, category)")
        .eq("user_id", userId).eq("lang", lang)
        .gte("lesson_date", from)
        .lte("lesson_date", to),
      db
        .from("theme_plan")
        .select("plan_date, title_zh, source, topic_id, topics(title_zh, category)")
        .eq("user_id", userId).eq("lang", lang)
        .eq("status", "planned")
        .gte("plan_date", from)
        .lte("plan_date", to),
    ]);
    // Supabase 把巢狀關聯推斷成陣列，實際上是 0..1 筆
    const one = (t: unknown): TopicRef =>
      Array.isArray(t) ? ((t[0] as TopicRef) ?? null) : ((t as TopicRef) ?? null);

    return {
      lessons: (lessons ?? []).map((l) => ({ ...l, topics: one(l.topics) })) as WeekRow["lessons"],
      plans: (plans ?? []).map((p) => ({ ...p, topics: one(p.topics) })) as WeekRow["plans"],
    };
}

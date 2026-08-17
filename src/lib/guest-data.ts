import { unstable_cache } from "next/cache";
import type { Lang } from "@/lib/lang";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 訪客頁的句子。
 *
 * 內容是固定的十句，只有補音檔時會動，所以快取一小時。tag 用自己的，
 * 不跟 lessons 共用——每天產卡 revalidate 一次沒必要把這裡也清掉。
 */
export const TAG_GUEST = "guest";

export type GuestPhrase = {
  lang: Lang;
  sort_order: number;
  target: string;
  reading: string | null;
  zh: string;
  /** 播放鍵用的 clip key，同時也是 AudioProvider 的索引 */
  clipKey: string;
  audioUrl: string | null;
};

export const getGuestPhrases = unstable_cache(
  async (): Promise<GuestPhrase[]> => {
    const db = createAdminClient();
    const { data } = await db
      .from("guest_phrases")
      .select("lang, sort_order, target, reading, zh, audio_path")
      .order("lang")
      .order("sort_order");

    return (data ?? []).map((p) => ({
      lang: p.lang as Lang,
      sort_order: p.sort_order,
      target: p.target,
      reading: p.reading,
      zh: p.zh,
      clipKey: `g${p.lang}${p.sort_order}`,
      audioUrl: p.audio_path
        ? db.storage.from("lesson-audio").getPublicUrl(p.audio_path).data.publicUrl
        : null,
    }));
  },
  ["guest-phrases"],
  { tags: [TAG_GUEST], revalidate: 3600 },
);

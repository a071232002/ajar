import { cache } from "react";
import type { Lang } from "@/lib/lang";
import { isLang } from "@/lib/lang";
import { createClient } from "@/lib/supabase/server";

/**
 * 設定與主題的讀取。這一層走使用者自己的 session（不是 admin），
 * 所以 RLS 就是防線 —— 拿不到別人的資料不是靠程式判斷，是靠資料庫。
 * 不加 unstable_cache：這些會被使用者即時修改，快取只會製造困惑。
 */

export type Profile = {
  id: string;
  display_name: string | null;
  background_zh: string | null;
  langs: Lang[];
  primary_lang: Lang;
};

export type Topic = {
  id: string;
  owner_id: string | null;
  title_zh: string;
  category: string;
  axis_hint_zh: string | null;
  sort_order: number;
};

/** 同一次 render 內只查一次 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;

  const { data } = await db
    .from("profiles")
    .select("id, display_name, background_zh, langs, primary_lang")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  // 第一次登入還沒有設定列，給一個預設的（不寫入，等使用者按儲存才建）
  return (
    data ?? {
      id: user.id,
      display_name: null,
      background_zh: null,
      langs: ["en"],
      primary_lang: "en",
    }
  );
});

/** 系統預設 + 自己建的主題，附上「有沒有勾」 */
export const getTopics = cache(
  async (): Promise<(Topic & { picked: boolean })[]> => {
    const db = await createClient();
    const [{ data: topics }, { data: picks }] = await Promise.all([
      db
        .from("topics")
        .select("id, owner_id, title_zh, category, axis_hint_zh, sort_order")
        .order("sort_order"),
      db.from("user_topics").select("topic_id"),
    ]);
    const picked = new Set((picks ?? []).map((p) => p.topic_id));
    return (topics ?? []).map((t) => ({ ...t, picked: picked.has(t.id) }));
  },
);

export type FocusBlock = {
  id: string;
  lang: Lang;
  topic_id: string;
  starts_on: string;
  ends_on: string;
  source: string;
  topics: { title_zh: string; category: string } | null;
};

/** 這個語言目前排定的集中期（含未來） */
export async function getFocusBlocks(
  lang: Lang,
  from: string,
  to: string,
): Promise<FocusBlock[]> {
  const db = await createClient();
  const { data } = await db
    .from("focus_blocks")
    .select("id, lang, topic_id, starts_on, ends_on, source, topics(title_zh, category)")
    .eq("lang", lang)
    .lte("starts_on", to)
    .gte("ends_on", from)
    .order("starts_on");

  // 同上：巢狀關聯攤平成單一物件
  return (data ?? []).map((b) => ({
    ...b,
    topics: (Array.isArray(b.topics) ? b.topics[0] : b.topics) ?? null,
  })) as FocusBlock[];
}

/** 網址上的語言片段；不合法或使用者沒啟用就退回主要語言 */
export function resolveLang(raw: string | undefined, profile: Profile | null): Lang {
  if (isLang(raw) && (profile?.langs ?? ["en"]).includes(raw)) return raw;
  return profile?.primary_lang ?? "en";
}

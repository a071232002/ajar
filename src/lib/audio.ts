import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "lesson-audio";

/** 取這張卡已產好的音檔：clip_key → 公開 URL */
export async function lessonAudioUrls(
  db: SupabaseClient,
  lessonId: string,
): Promise<Record<string, string>> {
  const { data } = await db
    .from("lesson_audio")
    .select("clip_key, path")
    .eq("lesson_id", lessonId);

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.clip_key] = db.storage.from(BUCKET).getPublicUrl(row.path).data.publicUrl;
  }
  return map;
}

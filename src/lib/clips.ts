import type { LessonContent } from "@/lib/lesson-schema";
import { stripMarks } from "@/lib/markup";

/**
 * 把卡片內容展開成「可播放的句子」清單。
 * key 同時是 UI 播放鍵與音檔的 clip_key——scripts/generate-audio.mjs 必須產生一致的 key。
 */

/** 全部連播的順序 */
export function allClipKeys(content: LessonContent): string[] {
  const keys: string[] = [];
  content.meanings.forEach((m, i) =>
    m.variants.forEach((_, j) => keys.push(`m${i}v${j}`)),
  );
  content.key_points.forEach((_, i) => keys.push(`kp${i}`));
  content.dialogue.forEach((_, i) => keys.push(`dlg${i}`));
  keys.push("exercise");
  content.vocab.forEach((_, i) => keys.push(`v${i}`));
  return keys;
}

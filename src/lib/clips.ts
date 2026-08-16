import type { LessonContent } from "@/lib/lesson-schema";

/**
 * 把卡片內容展開成「可播放的句子」清單。
 * key 同時是 UI 播放鍵與音檔的 clip_key——scripts/generate-audio.mjs 必須產生一致的 key。
 */
export function clipTexts(content: LessonContent): Record<string, string> {
  const map: Record<string, string> = {};
  content.meanings.forEach((m, i) =>
    m.variants.forEach((v, j) => {
      map[`m${i}v${j}`] = v.en;
    }),
  );
  content.key_points.forEach((k, i) => {
    map[`kp${i}`] = k.example_en;
  });
  content.dialogue.forEach((d, i) => {
    map[`dlg${i}`] = d.en;
  });
  map.exercise = content.exercise.model_en;
  content.vocab.forEach((v, i) => {
    map[`v${i}`] = v.phrase;
  });
  return map;
}

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

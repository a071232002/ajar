/** 只支援英日兩種，其餘一律當不存在 */
export const LANGS = ["en", "ja"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_ZH: Record<Lang, string> = { en: "英文", ja: "日文" };
export const LANG_TAG: Record<Lang, string> = { en: "EN", ja: "JA" };

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as readonly string[]).includes(v);
}

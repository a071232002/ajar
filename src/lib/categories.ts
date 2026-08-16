/** 分類顯示名稱（category 為自由文字，未知分類原樣顯示） */
const CATEGORY_ZH: Record<string, string> = {
  interview: "面試英文",
  work: "職場英文",
  life: "生活英文",
};

export function categoryZh(category: string): string {
  return CATEGORY_ZH[category] ?? category;
}

/**
 * 分類顯示名稱（category 為自由文字，未知分類原樣顯示）。
 * 名稱裡不含語言——分類是情境（面試、旅遊），語言是另一個維度，
 * 兩者融成「面試英文」這種字串會在加日文時壞掉。
 */
const CATEGORY_ZH: Record<string, string> = {
  interview: "面試",
  work: "職場",
  life: "生活",
  travel: "旅遊",
};

export function categoryZh(category: string): string {
  return CATEGORY_ZH[category] ?? category;
}

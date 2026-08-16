/** 所有「日」的邊界一律以台北時區計算 */
const TZ = "Asia/Taipei";

/** 回傳台北時區的今天，格式 YYYY-MM-DD */
export function taipeiToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** YYYY-MM-DD 加減天數（純日期運算，與時區無關） */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 兩個 YYYY-MM-DD 的差距天數（a - b） */
export function diffDays(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000,
  );
}

/** 「8月16日 · 星期六」格式 */
export function formatLessonDate(date: string): string {
  const d = new Date(`${date}T00:00:00+08:00`);
  const md = new Intl.DateTimeFormat("zh-TW", {
    timeZone: TZ,
    month: "long",
    day: "numeric",
  }).format(d);
  const weekday = new Intl.DateTimeFormat("zh-TW", {
    timeZone: TZ,
    weekday: "long",
  }).format(d);
  return `${md} · ${weekday}`;
}

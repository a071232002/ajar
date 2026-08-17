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

/** 該日期所屬週的星期一 */
export function mondayOf(date: string): string {
  const dow = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(date, -dow);
}

/**
 * 一週橫跨兩個月時，這週算哪個月？—— 看星期四那天。
 * 星期四是七天的第四天，所以它所在的月份必定占這週至少四天，
 * 「多數決」與 ISO 8601 的定義在這裡剛好一致。
 */
export function weekMonth(monday: string): { year: number; month: number } {
  const thursday = addDays(monday, 3);
  return { year: Number(thursday.slice(0, 4)), month: Number(thursday.slice(5, 7)) };
}

/**
 * 某年某月的第一週（回傳該週星期一）。
 * 含 1 號的那一週若星期四還落在上個月（例如 2026-11-01 是週日，整週有六天在十月），
 * 就往後推一週，否則選了十一月會看到一個標示為十月的畫面。
 */
export function firstWeekOfMonth(year: number, month: number): string {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const monday = mondayOf(first);
  const w = weekMonth(monday);
  return w.year === year && w.month === month ? monday : addDays(monday, 7);
}

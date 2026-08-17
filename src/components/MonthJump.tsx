"use client";

/**
 * 行事曆上方的年/月選擇。
 *
 * 用原生的 GET 表單，不用 router.push。
 * 原因是實測過的：router.push 在這裡會送出 RSC 請求卻不提交導覽——1280px 會成功，
 * 700px 與 375px 不會，同一份程式碼、同一個回應。包進 useTransition 更糟，
 * 二十秒都不會完成。原生表單送出是一次真正的導覽，沒有這些變數，
 * 而且沒有 JS 也能運作。
 *
 * 換月份由 onChange 直接送出表單；瀏覽器停用 JS 時還有「前往」可按。
 */
export default function MonthJump({
  lang,
  year,
  month,
}: {
  lang: string;
  year: number;
  month: number;
}) {
  const years = [year - 1, year, year + 1].filter((v, i, a) => a.indexOf(v) === i);
  const cls = "rounded border border-soft/50 bg-paper px-2 py-1 text-sm text-ink";

  const submit = (e: React.ChangeEvent<HTMLSelectElement>) =>
    e.currentTarget.form?.requestSubmit();

  return (
    <form
      method="get"
      action={`/${lang}/calendar`}
      className="flex items-center gap-1.5"
    >
      <select
        key={`y-${year}`}
        name="y"
        aria-label="年"
        defaultValue={year}
        onChange={submit}
        className={cls}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y} 年
          </option>
        ))}
      </select>
      <select
        key={`m-${month}`}
        name="m"
        aria-label="月"
        defaultValue={month}
        onChange={submit}
        className={cls}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>
            {m} 月
          </option>
        ))}
      </select>
      <button type="submit" className="sr-only">
        前往
      </button>
    </form>
  );
}

/** 行事曆的週檢視骨架——七列，跟實際版面對齊，換頁時不會跳動 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-6 w-36 rounded bg-soft/25 animate-skeleton" />
        <div className="h-6 w-28 rounded bg-soft/20 animate-skeleton" />
      </div>

      <div className="sheet animate-skeleton">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-t border-[var(--edge)] py-3.5 first:border-t-0 first:pt-0"
          >
            <div className="h-4 w-16 shrink-0 rounded bg-soft/20" />
            <div
              className="h-4 rounded bg-soft/15"
              style={{ width: `${38 + ((i * 13) % 42)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

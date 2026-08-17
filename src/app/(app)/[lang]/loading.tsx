/**
 * 頁面是 server component 且 force-dynamic，點下去要等伺服器算完。
 * 沒有這個檔案時畫面完全不動，使用者分不出「沒點到」還是「在等」。
 * 骨架沿用 .folder-skin / .sheet，換材質時會跟著換。
 */
export default function Loading() {
  return (
    <div className="folder-skin relative mx-auto max-w-[700px] rounded-xl px-4 pb-6 pt-4 sm:px-5">
      <div className="mb-4 h-5 w-40 rounded bg-soft/25 animate-skeleton" />

      <div className="sheet animate-skeleton mb-4">
        <div className="h-7 w-3/5 rounded bg-soft/25" />
        <div className="mt-3 h-4 w-2/5 rounded bg-soft/20" />
        <div className="mt-3 h-4 w-4/5 rounded bg-soft/15" />
      </div>

      {[0, 1, 2].map((i) => (
        <div key={i} className="sheet animate-skeleton mb-4">
          <div className="h-5 w-1/3 rounded bg-soft/25" />
          <div className="mt-4 flex gap-4">
            <div className="h-4 w-12 rounded bg-soft/20" />
            <div className="h-4 w-12 rounded bg-soft/15" />
            <div className="h-4 w-12 rounded bg-soft/15" />
          </div>
          <div className="say-row mt-5">
            <span className="say-slot">
              <span className="block h-10 w-10 rounded-full bg-soft/20" />
            </span>
            <div className="say-body">
              <div className="h-5 w-full rounded bg-soft/20" />
              <div className="mt-2.5 h-5 w-11/12 rounded bg-soft/15" />
              <div className="mt-4 h-4 w-3/4 rounded bg-soft/12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

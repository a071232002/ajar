import {
  createFocusBlock,
  deleteFocusBlock,
} from "@/app/(app)/[lang]/calendar/actions";
import { LANG_ZH, type Lang } from "@/lib/lang";

type Topic = { id: string; title_zh: string };
type Block = {
  id: string;
  starts_on: string;
  ends_on: string;
  source: string;
  topics: { title_zh: string; category: string } | null;
};

/**
 * 集中期：一段時間都練同一個主題。
 * 這取代了原本寫死的「一章七課」——章題與長度都由使用者決定。
 */
export default function FocusBlockForm({
  lang,
  topics,
  blocks,
  today,
  back,
}: {
  lang: Lang;
  topics: Topic[];
  blocks: Block[];
  today: string;
  back: string;
}) {
  return (
    <div className="sheet tilt-r animate-sheet-in mt-4" data-testid="focus-blocks">
      <p className="hand-tag mb-1">
        <span className="lead">集中期</span>
        <span className="sub">一段時間都練同一個主題</span>
      </p>
      <p className="mb-4 text-[13px] text-soft">
        沒有安排時，系統會自己從你勾選的主題接上去，每天一樣有卡。
        這裡設的排程不會被覆蓋。
      </p>

      {blocks.length > 0 && (
        <ul className="mb-4 flex flex-col gap-1.5">
          {blocks.map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-3 border-b border-[var(--edge)] pb-1.5 text-[14px] last:border-b-0"
            >
              <span className="font-mono text-[12.5px] text-soft">
                {b.starts_on.slice(5)} – {b.ends_on.slice(5)}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {b.topics?.title_zh ?? "（主題已刪除）"}
              </span>
              <span className="font-mono text-[11.5px] text-soft">
                {b.source === "user" ? "你排的" : "自動"}
              </span>
              <form action={deleteFocusBlock}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="back" value={back} />
                <button type="submit" className="text-[12.5px] text-soft hover:text-accent">
                  取消
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {topics.length === 0 ? (
        <p className="text-[14px] text-soft">
          還沒勾選任何主題。先到「設定」勾幾個，這裡才有東西可以排。
        </p>
      ) : (
        <form action={createFocusBlock} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="back" value={back} />
          <span className="text-[14px] text-soft">{LANG_ZH[lang]}：從</span>
          <input
            type="date"
            name="starts_on"
            required
            min={today}
            defaultValue={today}
            aria-label="集中期開始日"
            className="rounded border border-soft/50 bg-paper px-2 py-1 text-[14px] text-ink"
          />
          <span className="text-[14px] text-soft">起，集中練</span>
          <select
            name="topic_id"
            required
            aria-label="集中期主題"
            className="rounded border border-soft/50 bg-paper px-2 py-1 text-[14px] text-ink"
          >
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title_zh}
              </option>
            ))}
          </select>
          <select
            name="days"
            defaultValue="14"
            aria-label="集中期天數"
            className="rounded border border-soft/50 bg-paper px-2 py-1 text-[14px] text-ink"
          >
            {[7, 14, 21, 30, 60].map((n) => (
              <option key={n} value={n}>
                {n} 天
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-accent px-5 py-1.5 text-[14px] font-medium text-white"
          >
            排定
          </button>
        </form>
      )}
    </div>
  );
}

import SubmitButton from "@/components/SubmitButton";
import { categoryZh } from "@/lib/categories";
import { LANGS, LANG_ZH } from "@/lib/lang";
import { getProfile, getTopics } from "@/lib/profile-data";
import { addTopic, saveProfile, saveTopicPicks } from "./actions";

export const dynamic = "force-dynamic";

const SAVED_MSG: Record<string, string> = {
  profile: "語言與個人背景已儲存",
  topics: "主題勾選已儲存",
  "topic-added": "主題已新增，並自動勾選",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const [profile, topics] = await Promise.all([getProfile(), getTopics()]);
  if (!profile) return null;

  const byCategory = topics.reduce<Record<string, typeof topics>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-[700px]" data-testid="settings">
      <div className="folder-skin relative rounded-xl px-4 pb-6 pt-4 shadow-[0_12px_30px_var(--shadow)] sm:px-5">
        <p className="case-label mb-4">設定</p>

        {saved && SAVED_MSG[saved] && (
          <p
            role="status"
            data-testid="saved-banner"
            className="mb-4 rounded-md border border-accent/40 bg-hl/25 px-4 py-2.5 text-[14px] text-ink"
          >
            ✓ {SAVED_MSG[saved]}
          </p>
        )}

        {/* ── 語言 ── */}
        <form action={saveProfile} className="sheet animate-sheet-in mb-4">
          <p className="hand-tag mb-3">
            <span className="lead">語言</span>
            <span className="sub">要學哪幾種、進站先看哪一種</span>
          </p>

          <div className="flex flex-col gap-2.5">
            {LANGS.map((l) => (
              <label key={l} className="flex items-center gap-3 text-[15px]">
                <input
                  type="checkbox"
                  name={`lang-${l}`}
                  defaultChecked={profile.langs.includes(l)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span>{LANG_ZH[l]}</span>
                <span className="font-mono text-xs text-soft">{l.toUpperCase()}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[15px]">
            <span className="text-soft">進站預設看</span>
            <select
              name="primary_lang"
              defaultValue={profile.primary_lang}
              aria-label="預設語言"
              className="rounded border border-soft/50 bg-paper px-2 py-1 text-ink"
            >
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANG_ZH[l]}
                </option>
              ))}
            </select>
          </div>

          <p className="hand-tag mb-3 mt-6">
            <span className="lead">個人背景</span>
            <span className="sub">面試與職場的例句會照這個取材</span>
          </p>
          <textarea
            name="background_zh"
            rows={4}
            defaultValue={profile.background_zh ?? ""}
            placeholder="例：航空業 Java 後端，做 PAX 旅客資料介接給移民署做國安審查；熟 MQ、K8s。代表作是自建 EDIFACT 解析引擎。"
            className="w-full rounded-md border border-soft/40 bg-paper px-3 py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-soft/60"
          />
          <p className="mt-2 text-[13px] text-soft">
            這一欄不綁語言 —— 你的背景講英文講日文都一樣。
          </p>

          <div className="mt-4">
            <SubmitButton>儲存</SubmitButton>
          </div>
        </form>

        {/* ── 主題勾選 ── */}
        <form action={saveTopicPicks} className="sheet tilt-r animate-sheet-in mb-4">
          <p className="hand-tag mb-1">
            <span className="lead">想練的主題</span>
            <span className="sub">兩種語言共用這一組</span>
          </p>
          <p className="mb-4 text-[13px] text-soft">
            沒有安排集中期時，系統會從勾選的主題裡挑沒練過的接上去。
          </p>

          {Object.entries(byCategory).map(([cat, list]) => (
            <div key={cat} className="mb-4">
              <p className="mb-1.5 font-mono text-[12px] uppercase tracking-wider text-soft">
                {categoryZh(cat)}
              </p>
              <div className="flex flex-col gap-1.5">
                {list.map((t) => (
                  <label key={t.id} className="flex items-start gap-3 text-[15px]">
                    <input
                      type="checkbox"
                      name="topic"
                      value={t.id}
                      defaultChecked={t.picked}
                      className="mt-1.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                    />
                    <span className="min-w-0">
                      {t.title_zh}
                      {t.owner_id && (
                        <span className="ml-2 font-mono text-[11px] text-accent">自訂</span>
                      )}
                      {t.axis_hint_zh && (
                        <span className="block text-[12.5px] leading-snug text-soft">
                          {t.axis_hint_zh}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <SubmitButton>儲存勾選</SubmitButton>
        </form>

        {/* ── 自訂主題 ── */}
        <form action={addTopic} className="sheet animate-sheet-in">
          <p className="hand-tag mb-3">
            <span className="lead">自己加一個主題</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              name="title_zh"
              required
              aria-label="主題名稱"
              placeholder="例：跟外籍同事解釋線上事故"
              className="min-w-0 flex-1 rounded-md border border-soft/40 bg-paper px-3 py-2 text-[15px] text-ink placeholder:text-soft/60"
            />
            <select
              name="category"
              aria-label="分類"
              defaultValue="work"
              className="rounded border border-soft/50 bg-paper px-2 py-2 text-[15px] text-ink"
            >
              {["interview", "work", "life", "travel"].map((c) => (
                <option key={c} value={c}>
                  {categoryZh(c)}
                </option>
              ))}
            </select>
            <SubmitButton variant="outline" pendingLabel="新增中…">
              新增
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

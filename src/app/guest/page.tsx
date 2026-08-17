import Link from "next/link";
import AudioProvider from "@/components/AudioProvider";
import PlayButton from "@/components/PlayButton";
import { getGuestPhrases } from "@/lib/guest-data";
import { LANG_TAG, LANG_ZH, LANGS, type Lang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "試聽 · ajar",
  description: "十句英日常用句，不用登入就能聽。",
};

/**
 * 訪客頁：不用登入的十句試聽。
 *
 * 刻意做成固定內容而不是「今天的卡」——每天產卡是綁使用者的，訪客沒有使用者，
 * 硬要生一份就要多養一條排程。十句手挑的句子已經足夠讓人判斷這站的內容手感。
 */
export default async function GuestPage() {
  const phrases = await getGuestPhrases();
  const urls = Object.fromEntries(
    phrases.filter((p) => p.audioUrl).map((p) => [p.clipKey, p.audioUrl!]),
  );

  return (
    <main className="mx-auto max-w-[700px] px-4 py-10">
      <AudioProvider urls={urls} />

      <header className="mb-8 text-center">
        <h1 className="font-hand text-4xl font-semibold text-accent">ajar</h1>
        <p className="mt-1 font-mono text-xs text-soft">
          Keep your languages ajar.
        </p>
        <p className="mx-auto mt-5 max-w-[46ch] text-[15px] text-soft">
          每天一張學習卡，英日各一份，每句都有語音。下面十句是試聽——
          都是母語者真的會講的說法，不是課本例句。
        </p>
      </header>

      {LANGS.map((lang: Lang) => {
        const rows = phrases.filter((p) => p.lang === lang);
        if (!rows.length) return null;

        return (
          <section key={lang} className="mb-8">
            <h2 className="case-label mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className={`lang-tag lang-${lang}`}>{LANG_TAG[lang]}</span>
              <span className="mr-auto">{LANG_ZH[lang]}</span>
              <PlayButton
                id={`all-${lang}`}
                clipKeys={rows.map((r) => r.clipKey)}
                variant="pill"
                label="全部連播"
              />
            </h2>

            <ul className="sheet flex flex-col gap-4 px-5 py-5">
              {rows.map((p) => (
                <li key={p.clipKey} className="flex items-start gap-3">
                  <PlayButton id={p.clipKey} clipKeys={[p.clipKey]} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] leading-snug text-ink">{p.target}</p>
                    {p.reading && (
                      <p className="mt-0.5 font-mono text-xs text-soft">{p.reading}</p>
                    )}
                    <p className="mt-1 text-sm text-soft">{p.zh}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className="mt-10 text-center text-sm text-soft">
        <Link href="/login" className="text-accent underline underline-offset-4">
          有帳號？進入
        </Link>
      </p>
    </main>
  );
}

#!/usr/bin/env python3
"""為缺音檔的日文學習卡產生語音（Kokoro-82M）。

    python scripts/generate-audio-ja.py [--limit N] [--lesson-date YYYY-MM-DD] [--guest]

為什麼日文要另開一支而不是併進 generate-audio.mjs：kokoro-js 的 phonemizer 只
支援 en-us / en-gb，日語的 G2P 要走 misaki[ja]（pyopenjtalk + unidic），那是
Python-only 的東西。模型本身是同一顆 Kokoro-82M，換的是前端的注音方式。

刻意與 generate-audio.mjs 對齊的部分：
- clip_key 的命名與展開順序（必須與 src/lib/clips.ts 一致，否則播放鍵對不到檔）
- 生成當下就決定語音並烘進 MP3；對話兩角色鎖不同性別的聲音
- 冪等：已存在的 (lesson_id, clip_key) 直接跳過，失敗隔天自動補跑

需要環境變數：NEXT_PUBLIC_SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY
選用：APP_URL、CRON_SECRET（補完音檔後叫網站清讀取快取）
"""

import argparse
import json
import os
import random
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

BUCKET = "lesson-audio"

# ── 日語語音池 ────────────────────────────────────────────────────
# Kokoro 的日語只有五顆，四女一男。男聲僅 jm_kumo 一顆，所以對話配音的規則跟
# 英文版不同：英文是「兩邊隨機、性別互斥」，這裡男聲沒得挑，只能決定男聲落在
# 哪一邊。旁白仍然輪替，避免整張卡同一個人從頭念到尾。
VOICES_F = ["jf_alpha", "jf_gongitsune", "jf_nezumi", "jf_tebukuro"]
VOICES_M = ["jm_kumo"]
NARRATION_POOL = VOICES_F + VOICES_M


# ── Supabase REST（不裝 supabase-py，這支只需要四種呼叫）──────────
class Supabase:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.key = key

    def _req(self, method, path, *, data=None, headers=None, raw=False):
        h = {
            "apikey": self.key,
            "authorization": f"Bearer {self.key}",
            **(headers or {}),
        }
        body = data
        if data is not None and not raw:
            body = json.dumps(data).encode("utf-8")
            h.setdefault("content-type", "application/json")
        req = urllib.request.Request(
            f"{self.url}{path}", data=body, method=method, headers=h
        )
        try:
            with urllib.request.urlopen(req) as r:
                text = r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")
            raise RuntimeError(f"{method} {path} → HTTP {e.code}: {detail}") from None
        return json.loads(text) if text.strip().startswith(("[", "{")) else text

    def select(self, table, query):
        return self._req("GET", f"/rest/v1/{table}?{query}")

    def upsert(self, table, rows, on_conflict):
        return self._req(
            "POST",
            f"/rest/v1/{table}?on_conflict={on_conflict}",
            data=rows,
            headers={"prefer": "resolution=merge-duplicates,return=minimal"},
        )

    def patch(self, table, query, values):
        return self._req(
            "PATCH", f"/rest/v1/{table}?{query}", data=values,
            headers={"prefer": "return=minimal"},
        )

    def upload(self, path, blob):
        return self._req(
            "POST",
            f"/storage/v1/object/{BUCKET}/{urllib.parse.quote(path)}",
            data=blob,
            raw=True,
            headers={"content-type": "audio/mpeg", "x-upsert": "true"},
        )


# ── 卡片 → 要念的句子 ─────────────────────────────────────────────
# 與 src/lib/clips.ts 的 allClipKeys 逐項對應。日文卡把日文放在 .en 欄位
# （schema 是語言中立的，欄名沿用英文版沒有改）。
def clips_of(content):
    clips = []
    for i, m in enumerate(content["meanings"]):
        for j, v in enumerate(m["variants"]):
            clips.append((f"m{i}v{j}", v["en"], "narration"))
    for i, k in enumerate(content["key_points"]):
        clips.append((f"kp{i}", k["example_en"], "narration"))
    for i, d in enumerate(content["dialogue"]):
        clips.append((f"dlg{i}", d["en"], "me" if d["side"] == "me" else "them"))
    clips.append(("exercise", content["exercise"]["model_en"], "narration"))
    for i, v in enumerate(content["vocab"]):
        clips.append((f"v{i}", v["phrase"], "narration"))
    return clips


# 句型標記只給畫面用，送進 TTS 前要剝掉，否則會唸出星號。
# 規則必須與 src/lib/markup.tsx 一致。
def strip_marks(text):
    return re.sub(r"\*\*(.+?)\*\*", r"\1", text)


# ── 阿拉伯數字 → 漢數字 ───────────────────────────────────────────
# misaki 的 cutlet 遇到單獨的數字 token 會直接 assert 掛掉
# （cutlet.py:355 `assert not surface.isdigit()`），所以「10分」「3000円」
# 這種再普通不過的句子都會炸。日文卡談時間、價錢、日期的機率極高，不能只是跳過。
# 轉成漢數字之後 unidic 就讀得出來（十分、三千円）。
_DIGITS = "〇一二三四五六七八九"
_BIG_UNITS = ["", "万", "億", "兆"]
_NUMBER = re.compile(r"\d[\d,]*(?:\.\d+)?")


def _kanji_under_10000(n):
    out = ""
    for unit, name in ((1000, "千"), (100, "百"), (10, "十")):
        d, n = divmod(n, unit)
        if d:
            # 日文的 1000／100／10 前面不加「一」：千円、百円、十分
            out += ("" if d == 1 else _DIGITS[d]) + name
    return out + (_DIGITS[n] if n else "")


def _kanji(n):
    if n == 0:
        return "〇"
    parts, i = [], 0
    while n and i < len(_BIG_UNITS):
        n, chunk = divmod(n, 10_000)
        if chunk:
            parts.append(_kanji_under_10000(chunk) + _BIG_UNITS[i])
        i += 1
    return "".join(reversed(parts))


def _spell_out(digits):
    return "".join(_DIGITS[int(d)] for d in digits)


def jp_numbers(text):
    def convert(m):
        raw = m.group(0).replace(",", "")
        whole, _, frac = raw.partition(".")
        # 太長的數字串通常是電話、房號、班機代號，逐字唸才對
        head = _kanji(int(whole)) if len(whole) <= 8 else _spell_out(whole)
        return f"{head}点{_spell_out(frac)}" if frac else head

    return _NUMBER.sub(convert, text)


def voice_plan(clips):
    """對話兩角色固定且不同性別；旁白輪替、避免連續重複。"""
    male_is_me = random.random() < 0.5
    role_voice = {
        "me": VOICES_M[0] if male_is_me else random.choice(VOICES_F),
        "them": random.choice(VOICES_F) if male_is_me else VOICES_M[0],
    }
    planned, prev = [], None
    for key, text, role in clips:
        if role != "narration":
            planned.append((key, text, role_voice[role]))
            continue
        v = random.choice(NARRATION_POOL)
        for _ in range(4):
            if v != prev:
                break
            v = random.choice(NARRATION_POOL)
        prev = v
        planned.append((key, text, v))
    return planned


# ── 音訊 ──────────────────────────────────────────────────────────
def to_mp3(samples, sample_rate):
    """float32 PCM → MP3。透過 ffmpeg 的 stdin/stdout，不落地暫存檔。"""
    import numpy as np

    pcm = np.asarray(samples, dtype="float32")
    pcm = np.clip(pcm, -1.0, 1.0)
    proc = subprocess.run(
        [
            "ffmpeg", "-loglevel", "error", "-f", "f32le", "-ar", str(sample_rate),
            "-ac", "1", "-i", "pipe:0",
            # 單聲道 48kbps：與英文版同規格，語音夠清楚、體積小
            "-codec:a", "libmp3lame", "-b:a", "48k", "-f", "mp3", "pipe:1",
        ],
        input=pcm.tobytes(), capture_output=True, check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg 失敗：{proc.stderr.decode('utf-8', 'replace')}")
    return proc.stdout


class Tts:
    """延遲載入：先算出缺口，真的有事做才載模型（約 90MB + torch）。"""

    def __init__(self):
        self._pipe = None

    def _load(self):
        if self._pipe is None:
            from kokoro import KPipeline

            print("載入 Kokoro 模型（lang_code='j'）…")
            self._pipe = KPipeline(lang_code="j")
        return self._pipe

    def synth(self, text, voice):
        import numpy as np

        text = jp_numbers(text)
        chunks = []
        for _, _, audio in self._load()(text, voice=voice):
            if hasattr(audio, "detach"):  # torch.Tensor
                audio = audio.detach().cpu().numpy()
            chunks.append(np.asarray(audio, dtype="float32"))
        if not chunks:
            raise RuntimeError(f"Kokoro 沒有產出任何音訊：{text!r}")
        wav = np.concatenate(chunks) if len(chunks) > 1 else chunks[0]
        return wav, 24_000


# ── 主流程 ────────────────────────────────────────────────────────
def run_lessons(db, tts, limit, only_date):
    query = (
        "lang=eq.ja&select=id,lesson_date,content"
        f"&order=lesson_date.desc&limit={limit}"
    )
    if only_date:
        query += f"&lesson_date=eq.{only_date}"
    lessons = db.select("daily_lessons", query)
    if not lessons:
        print("沒有日文卡片。")
        return 0

    work = []
    for lesson in lessons:
        existing = db.select(
            "lesson_audio", f"lesson_id=eq.{lesson['id']}&select=clip_key"
        )
        done = {r["clip_key"] for r in existing}
        missing = [c for c in voice_plan(clips_of(lesson["content"])) if c[0] not in done]
        if missing:
            work.append((lesson, missing))

    if not work:
        print("所有日文卡片的音檔都齊全。")
        return 0

    total = sum(len(m) for _, m in work)
    print(f"待處理：{len(work)} 張卡、{total} 句")

    failed = 0
    for lesson, missing in work:
        print(f"\n▸ {lesson['lesson_date']}（{len(missing)} 句）")
        for key, text, voice in missing:
            # 一句失敗不該賠掉整張卡：已經產好的先存著，這一句留到下次補跑。
            # G2P 對某些寫法會直接 assert，那是那一句的問題，不是整張卡不能唸。
            try:
                wav, rate = tts.synth(strip_marks(text), voice)
                mp3 = to_mp3(wav, rate)
            except Exception as e:
                failed += 1
                print(f"  ✗ {key:<9} {type(e).__name__}: {e}　←　{text}")
                continue
            path = f"{lesson['id']}/{key}.mp3"
            db.upload(path, mp3)
            db.upsert(
                "lesson_audio",
                [{
                    "lesson_id": lesson["id"],
                    "clip_key": key,
                    "voice": voice,
                    "path": path,
                    "duration_ms": round(len(wav) / rate * 1000),
                }],
                "lesson_id,clip_key",
            )
            print(f"  ✓ {key:<9} {voice:<16} {len(mp3) // 1024}KB")
    return failed


def run_guest(db, tts):
    rows = db.select(
        "guest_phrases",
        "lang=eq.ja&audio_path=is.null&select=id,sort_order,target&order=sort_order",
    )
    if not rows:
        print("訪客頁的日文句子都有音檔了。")
        return 0

    print(f"訪客頁：{len(rows)} 句缺音檔")
    failed = 0
    for i, row in enumerate(rows):
        # 訪客頁沒有對話結構，用不同聲音輪著念，聽起來才不像同一個人錄的
        voice = NARRATION_POOL[i % len(NARRATION_POOL)]
        try:
            wav, rate = tts.synth(strip_marks(row["target"]), voice)
            mp3 = to_mp3(wav, rate)
        except Exception as e:
            failed += 1
            print(f"  ✗ ja-{row['sort_order']:<16} {type(e).__name__}: {e}")
            continue
        path = f"guest/ja-{row['sort_order']}.mp3"
        db.upload(path, mp3)
        db.patch("guest_phrases", f"id=eq.{row['id']}", {"audio_path": path})
        print(f"  ✓ {path:<20} {voice:<16} {len(mp3) // 1024}KB")
    return failed


def revalidate():
    app_url, secret = os.environ.get("APP_URL"), os.environ.get("CRON_SECRET")
    if not (app_url and secret):
        return
    # 音檔是直接寫進 Supabase 的，不經過網站任何寫入端，所以要主動叫它清讀取快取
    req = urllib.request.Request(
        f"{app_url}/api/revalidate",
        data=json.dumps({"tags": ["lessons", "guest"]}).encode("utf-8"),
        method="POST",
        headers={"authorization": f"Bearer {secret}", "content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            print(f"  快取失效：HTTP {r.status}")
    except Exception as e:  # 音檔本身已經寫進去了，這一步失敗不該讓整支掛掉
        print(f"  快取失效失敗（不影響音檔本身）：{e}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=5)
    ap.add_argument("--lesson-date")
    ap.add_argument("--guest", action="store_true", help="改為補訪客頁那幾句的音檔")
    args = ap.parse_args()

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (url and key):
        sys.exit("缺少 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")

    db, tts = Supabase(url, key), Tts()
    failed = (
        run_guest(db, tts)
        if args.guest
        else run_lessons(db, tts, args.limit, args.lesson_date)
    )
    revalidate()
    if failed:
        # 成功的部分已經寫進去了，下次補跑只會重試這幾句；但今天要讓 CI 顯示紅燈
        sys.exit(f"\n有 {failed} 句沒產出來（其餘已寫入）。")
    print("\n完成。")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        # 堆疊一定要留：這支是排程在跑的，只印一行訊息的話出事只能瞎猜
        import traceback

        traceback.print_exc()
        sys.exit(f"失敗：{type(e).__name__}: {e}")

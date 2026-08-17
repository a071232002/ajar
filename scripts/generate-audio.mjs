/**
 * 為缺音檔的學習卡產生語音（Kokoro-82M）。
 *
 *   node scripts/generate-audio.mjs [--limit N] [--lesson-date YYYY-MM-DD]
 *
 * 設計要點：
 * - **生成當下就決定語音並烘進 MP3**：一句一檔，重播固定；變化度來自不同句子不同人講。
 * - 對話角色各自鎖一顆（男女分開，聽得出誰在講）；其餘例句從「戲感較強」名單隨機取，避免連續重複。
 * - 冪等：已存在的 (lesson_id, clip_key) 直接跳過，失敗隔天自動補跑。
 *
 * 需要環境變數：NEXT_PUBLIC_SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

// ── 語音池：固定 4 顆（依 Kokoro 官方品質分級挑選）──
//   af_heart  A   全模型最高分，溫暖清楚
//   af_bella  A-  次高分，明亮、語調起伏大
//   am_michael C+ 男聲中最穩、最中性
//   am_fenrir  C+ 男聲中較低沉，與 michael 區隔明顯
// 刻意排除：af_nicole（氣音/ASMR 取向，語境不合）、bf_emma（英腔，與美式混用違和）、
//          am_puck（偏戲劇俏皮，中性度不足）。Kokoro 男聲整體弱於女聲，最高僅 C+。
const VOICES_F = ["af_heart", "af_bella"];
const VOICES_M = ["am_michael", "am_fenrir"];
const NARRATION_POOL = [...VOICES_F, ...VOICES_M];

const BUCKET = "lesson-audio";

// 本地執行時載入 .env.local（CI 由環境變數提供）
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0 && process.env[line.slice(0, i)] === undefined)
      process.env[line.slice(0, i)] = line.slice(i + 1);
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("缺少 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const args = process.argv.slice(2);
const argOf = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const LIMIT = Number(argOf("--limit") ?? 5);
const ONLY_DATE = argOf("--lesson-date");

/** 從卡片內容展開所有要念的句子；key 必須與 UI 的播放鍵一致 */
function clipsOf(content) {
  const clips = [];
  content.meanings.forEach((m, i) =>
    m.variants.forEach((v, j) =>
      clips.push({ key: `m${i}v${j}`, text: v.en, role: "narration" }),
    ),
  );
  content.key_points.forEach((k, i) =>
    clips.push({ key: `kp${i}`, text: k.example_en, role: "narration" }),
  );
  content.dialogue.forEach((d, i) =>
    clips.push({ key: `dlg${i}`, text: d.en, role: d.side === "me" ? "me" : "them" }),
  );
  clips.push({ key: "exercise", text: content.exercise.model_en, role: "narration" });
  content.vocab.forEach((v, i) =>
    clips.push({ key: `v${i}`, text: v.phrase, role: "narration" }),
  );
  return clips;
}

/** 句型標記（雙星號）只給畫面用；送進 TTS 前必須剝掉，否則會唸出星號。
 *  與 src/lib/markup.tsx 的規則必須一致。 */
const stripMarks = (t) => t.replace(/\*\*(.+?)\*\*/g, "$1");

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** 一張卡的配音方案：對話兩角色固定且不同性別；旁白隨機、避免連續重複 */
function voicePlan(clips) {
  const femaleFirst = Math.random() < 0.5;
  const roleVoice = {
    them: femaleFirst ? pick(VOICES_F) : pick(VOICES_M),
    me: femaleFirst ? pick(VOICES_M) : pick(VOICES_F),
  };
  let prev = null;
  return clips.map((c) => {
    if (c.role !== "narration") return { ...c, voice: roleVoice[c.role] };
    let v = pick(NARRATION_POOL);
    for (let i = 0; i < 4 && v === prev; i++) v = pick(NARRATION_POOL);
    prev = v;
    return { ...c, voice: v };
  });
}

/** Float32 PCM → MP3（純 JS 編碼，不依賴 ffmpeg） */
async function encodeMp3(float32, sampleRate) {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const pcm = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const enc = new Mp3Encoder(1, sampleRate, 48); // 單聲道 48kbps：語音夠清楚、體積小
  const chunks = [];
  const BLOCK = 1152;
  for (let i = 0; i < pcm.length; i += BLOCK) {
    const buf = enc.encodeBuffer(pcm.subarray(i, i + BLOCK));
    if (buf.length) chunks.push(Buffer.from(buf));
  }
  const tail = enc.flush();
  if (tail.length) chunks.push(Buffer.from(tail));
  return Buffer.concat(chunks);
}

async function loadKokoro() {
  const { KokoroTTS } = await import("kokoro-js");
  console.log("載入 Kokoro 模型…（首次約 90MB，之後由 HF 快取）");
  return KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
    dtype: "q8",
    device: "cpu",
  });
}

async function main() {
  let query = db
    .from("daily_lessons")
    // 只處理英文：kokoro-js 的 phonemizer 只支援 en-us/en-gb，
    // 日文要走 misaki[ja]（Python），是另一條管線
    .eq("lang", "en")
    .select("id, lesson_date, content")
    .order("lesson_date", { ascending: false })
    .limit(LIMIT);
  if (ONLY_DATE) query = query.eq("lesson_date", ONLY_DATE);

  const { data: lessons, error } = await query;
  if (error) throw new Error(error.message);
  if (!lessons?.length) return console.log("沒有卡片。");

  // 先算出所有缺口，沒缺口就不用載模型
  const work = [];
  for (const lesson of lessons) {
    const { data: existing } = await db
      .from("lesson_audio")
      .select("clip_key")
      .eq("lesson_id", lesson.id);
    const done = new Set((existing ?? []).map((r) => r.clip_key));
    const missing = voicePlan(clipsOf(lesson.content)).filter((c) => !done.has(c.key));
    if (missing.length) work.push({ lesson, missing });
  }
  if (!work.length) return console.log("所有卡片的音檔都齊全。");

  console.log(
    `待處理：${work.length} 張卡、${work.reduce((n, w) => n + w.missing.length, 0)} 句`,
  );
  const tts = await loadKokoro();

  for (const { lesson, missing } of work) {
    console.log(`\n▸ ${lesson.lesson_date}（${missing.length} 句）`);
    for (const clip of missing) {
      const audio = await tts.generate(stripMarks(clip.text), { voice: clip.voice });
      const mp3 = await encodeMp3(audio.audio, audio.sampling_rate);
      const path = `${lesson.id}/${clip.key}.mp3`;

      const { error: upErr } = await db.storage
        .from(BUCKET)
        .upload(path, mp3, { contentType: "audio/mpeg", upsert: true });
      if (upErr) throw new Error(`上傳失敗 ${path}: ${upErr.message}`);

      const { error: dbErr } = await db.from("lesson_audio").upsert(
        {
          lesson_id: lesson.id,
          clip_key: clip.key,
          voice: clip.voice,
          path,
          duration_ms: Math.round(
            (audio.audio.length / audio.sampling_rate) * 1000,
          ),
        },
        { onConflict: "lesson_id,clip_key" },
      );
      if (dbErr) throw new Error(`寫入失敗 ${path}: ${dbErr.message}`);

      console.log(`  ✓ ${clip.key.padEnd(9)} ${clip.voice.padEnd(12)} ${(mp3.length / 1024) | 0}KB`);
    }
  }
  // 音檔是直接寫進 Supabase 的，不經過網站任何寫入端，所以要主動叫它清讀取快取；
  // 否則今天稍早開過網站的話，那份「還沒有音檔」的結果會被鎖住。
  const appUrl = process.env.APP_URL;
  const secret = process.env.CRON_SECRET;
  if (appUrl && secret) {
    try {
      const r = await fetch(`${appUrl}/api/revalidate`, {
        method: "POST",
        headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
        body: JSON.stringify({ tags: ["lessons"] }),
      });
      console.log(`  快取失效：HTTP ${r.status}`);
    } catch (e) {
      console.log(`  快取失效失敗（不影響音檔本身）：${e.message}`);
    }
  }

  console.log("\n完成。");
}

main().catch((e) => {
  console.error("失敗：", e.message);
  process.exit(1);
});

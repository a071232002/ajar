/**
 * 清掉舊音檔與孤兒音檔。
 *
 *   node scripts/prune-audio.mjs [--keep-days 90] [--apply]
 *
 * 為什麼只刪音檔不刪卡片：卡片的價值是文字，一張卡幾 KB，留一輩子也沒差；
 * 音檔一張卡二三十句、每句數十 KB，才是真正會長大的東西。舊卡想重聽的話，
 * 手動跑一次 daily-audio 的 workflow_dispatch 帶日期就會重新產。
 *
 * 兩種要清的東西：
 *   1. 過期音檔  —— lesson_date 早於保留期的卡，其 lesson_audio 與 storage 檔案
 *   2. 孤兒目錄  —— storage 裡的資料夾對應不到任何 daily_lessons.id
 *                  （覆寫卡片時舊 id 的檔案不會跟著走，遷移也會留下一批）
 *
 * 預設只報告不刪。要真的刪必須明寫 --apply——這支是排程在跑的，
 * 手滑的代價是別人聽不到東西，安全預設值比較實在。
 *
 * 需要環境變數：NEXT_PUBLIC_SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

const BUCKET = "lesson-audio";
/** storage 裡不是以 lesson_id 命名、不該被當成孤兒的資料夾 */
const RESERVED_PREFIXES = ["guest"];

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
const KEEP_DAYS = Number(argOf("--keep-days") ?? 90);
const APPLY = args.includes("--apply");

const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000)
  .toISOString()
  .slice(0, 10);

/** storage 的 list 一次最多 100 筆，要自己翻頁 */
async function listAll(prefix) {
  const out = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await db.storage
      .from(BUCKET)
      .list(prefix, { limit: 100, offset });
    if (error) throw new Error(`列出 ${prefix || "/"} 失敗：${error.message}`);
    if (!data?.length) break;
    out.push(...data);
    if (data.length < 100) break;
  }
  return out;
}

async function removeAll(paths) {
  if (!APPLY || !paths.length) return;
  // storage 的 remove 一次別塞太多，分批送
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await db.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (error) throw new Error(`刪檔失敗：${error.message}`);
  }
}

async function main() {
  console.log(
    `保留 ${KEEP_DAYS} 天（${cutoff} 之後的卡片）` +
      (APPLY ? "" : "　※ 試跑，不會真的刪；要刪請加 --apply"),
  );

  const { data: lessons, error } = await db
    .from("daily_lessons")
    .select("id, lesson_date");
  if (error) throw new Error(error.message);

  const known = new Set((lessons ?? []).map((l) => l.id));
  const expired = (lessons ?? []).filter((l) => l.lesson_date < cutoff);

  // ── 1. 過期音檔 ──
  let expiredFiles = 0;
  const expiredPaths = [];
  for (const lesson of expired) {
    const files = await listAll(lesson.id);
    if (!files.length) continue;
    expiredFiles += files.length;
    expiredPaths.push(...files.map((f) => `${lesson.id}/${f.name}`));
  }
  if (expiredPaths.length) {
    await removeAll(expiredPaths);
    if (APPLY) {
      const { error: delErr } = await db
        .from("lesson_audio")
        .delete()
        .in("lesson_id", expired.map((l) => l.id));
      if (delErr) throw new Error(`清 lesson_audio 失敗：${delErr.message}`);
    }
  }
  console.log(
    `過期音檔：${expired.length} 張卡、${expiredFiles} 個檔案` +
      (APPLY ? " → 已刪除" : ""),
  );

  // ── 2. 孤兒目錄 ──
  const top = await listAll("");
  const orphanPaths = [];
  let orphanDirs = 0;
  for (const entry of top) {
    // 檔案（有 id 的項目）不是資料夾；保留名單也跳過
    if (entry.id !== null || RESERVED_PREFIXES.includes(entry.name)) continue;
    if (known.has(entry.name)) continue;
    const files = await listAll(entry.name);
    if (!files.length) continue;
    orphanDirs += 1;
    orphanPaths.push(...files.map((f) => `${entry.name}/${f.name}`));
  }
  await removeAll(orphanPaths);
  console.log(
    `孤兒目錄：${orphanDirs} 個、${orphanPaths.length} 個檔案` +
      (APPLY ? " → 已刪除" : ""),
  );

  if (!APPLY && expiredPaths.length + orphanPaths.length > 0) {
    console.log("\n以上都沒有動。確認沒問題後加 --apply 重跑。");
  }
}

main().catch((e) => {
  console.error("失敗：", e.message);
  process.exit(1);
});

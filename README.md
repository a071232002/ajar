# ajar

Keep your languages ajar. — 每天，為語言留一道縫。

個人每日語言學習站，英文與日文各一張卡。每天早上由排程生成當日「學習卡」寫入資料庫，
另一支排程補上每句的語音。全站零 API 費用。

## 這個 repo 的內容

只放**遠端部署會用到**的程式：

```
src/app/(app)/[lang]/       登入後的學習頁（今日卡片、指定日期、行事曆），lang 為 en 或 ja
src/app/(app)/settings/     啟用語言、個人背景、主題勾選
src/app/guest/              不用登入的試聽頁（英日各五句）
src/app/api/                機器端點（lesson-brief / lesson / plan / revalidate），CRON_SECRET 鑑權
src/lib/lesson-schema.ts    學習卡 JSON 的唯一 Zod 定義（API 驗證與前端型別同源）
src/lib/clips.ts            句子 → clip_key 的展開規則，產音腳本必須產生一致的 key
scripts/generate-audio.mjs  英文語音（Kokoro-82M，Node）
scripts/generate-audio-ja.py 日文語音（Kokoro + misaki[ja]，Python）
scripts/prune-audio.mjs     清舊音檔與孤兒目錄
.github/workflows/          每日產音、每季清理
supabase/migrations/        資料庫 schema
```

本機開發與測試工具（Playwright E2E、compose、示範資料、Supabase 本機設定、`docs/`）不在此 repo。

## 每日流程

```
05:00  本機工作排程器 → claude -p  →  POST /api/lesson    英日各寫一張卡
05:30  GitHub Actions（兩個平行 job）→  英文 Kokoro / 日文 misaki+Kokoro  →  MP3 上傳 Storage
```

兩者皆為冪等：已存在就跳過，失敗隔天自動補上。
產音那支還會自我修復——**音檔的聲音若不屬於該卡的語言就重產**
（曾發生英文管線把日文卡用英文聲音唸掉，線上聽起來像外國人）。

**缺音檔時播放鍵會停用，不會退回瀏覽器語音。** 這是刻意的：
瀏覽器的語音清單各家不同，Chrome 在只裝中文語音的機器上會用中文唸日文。
寧可讓人看到「還沒有語音」，也不要聽到錯的語言。

## 部署

### 1. Supabase

建立免費專案（region 建議 Singapore），然後：

1. SQL Editor 依序執行 `supabase/migrations/` 內的 SQL
2. Authentication → Users → Add user 建立帳號（勾選 auto-confirm）
3. **Authentication → Providers 關閉公開註冊**（這是個人站，帳號手動開）
4. 記下 Project URL、anon key、service_role key

### 2. Vercel

Import 這個 repo（Hobby 方案），填入環境變數：

| 變數 | 來源 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key（**絕不加 `NEXT_PUBLIC_` 前綴**） |
| `CRON_SECRET` | 自訂隨機值，`openssl rand -hex 32` |

`vercel.json` 已設定 `regions: ["sin1"]`——Supabase 在 ap-southeast-1，
函式若留在美東每個查詢都要跨一趟太平洋（實測 6 個查詢 1210ms → 550ms）。

部署後的網址即為 `APP_URL`。

### 3. GitHub Secrets（產音與清理）

repo Settings → Secrets and variables → Actions：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`（音檔直寫 Supabase，補完要回頭叫網站清讀取快取）

### 4. 每日生成排程

Windows 工作排程器，每天 05:00（`-WakeToRun -StartWhenAvailable`），執行 `docs/routine/run.ps1`。
它讀使用者啟用的語言，對每種語言跑一輪 headless `claude -p`，用訂閱身分生成、不需 API 儲值。

雲端 routine（claude.ai 的 `/routines`）試過但不可行：沙箱的 bash 連不出外網，
WebFetch 又只能 GET，寫不進 API。

## 開發

E2E（Playwright + podman compose）、本機 Supabase 設定與開發規範都不在這個 repo，
只留在本機。原則：**本機做完、容器 E2E 全綠，才推版。**

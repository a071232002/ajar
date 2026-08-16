# ajar

Keep your English ajar. — 每天，為英文留一道縫。

個人英文每日學習站。每天早上由 Claude Code 排程 routine 生成一張「學習卡」寫入資料庫，
另一支排程用 Kokoro 產出每句的語音。全站零 API 費用。

## 這個 repo 的內容

只放**遠端部署會用到**的程式：

```
src/app/(app)/        登入後頁面（今日卡片、行事曆、指定日期卡片）
src/app/api/          生成 API（lesson-brief / lesson / plan / chapters），CRON_SECRET 鑑權
src/lib/lesson-schema.ts   學習卡 JSON 的唯一 Zod 定義（API 驗證與前端型別同源）
scripts/generate-audio.mjs Kokoro 產音工人（由 GitHub Actions 執行）
.github/workflows/    每日產音排程
supabase/migrations/  資料庫 schema
```

本機開發與測試工具（Playwright E2E、compose、示範資料腳本、Supabase 本機設定）不在此 repo。

## 部署

### 1. Supabase

建立免費專案（region 建議 Singapore / Tokyo），然後：

1. SQL Editor 執行 `supabase/migrations/` 內的 SQL
2. Authentication → Users → Add user 建立你的帳號（勾選 auto-confirm）
3. 記下 Project URL、anon key、service_role key

### 2. Vercel

Import 這個 repo（Hobby 方案），填入環境變數：

| 變數 | 來源 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key（僅伺服端） |
| `CRON_SECRET` | 自訂隨機值，`openssl rand -hex 32` |

部署後的網址即為 `APP_URL`。

### 3. GitHub Secrets（產音工人）

repo Settings → Secrets and variables → Actions，新增：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Claude Code 排程 routine

用 `/schedule` 建立每天 05:00（Asia/Taipei）的 routine，任務內容需帶上 `APP_URL` 與 `CRON_SECRET`。
routine 每天會：取得 brief → 生成學習卡 → 補足未來 7 天預排主題 → 寫回 API。

## 每日流程

```
05:00  Claude routine  →  POST /api/lesson    寫入當天學習卡
05:30  GitHub Actions  →  Kokoro 產 17 句 MP3  上傳 Supabase Storage
```

兩者皆為冪等：已存在就跳過，失敗隔天自動補上。網站在缺音檔時會退回瀏覽器語音，不會開天窗。

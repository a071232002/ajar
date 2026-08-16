-- Ajar 初始 schema（PLAN.md §2、§3；content schema v2 學習卡格式）

-- 章節（主題的上層分類；category 為自由文字：interview / work / life / 未來任意新增）
create table chapters (
  id         uuid primary key default gen_random_uuid(),
  sort_order int not null unique,
  title_en   text not null,
  title_zh   text not null,
  category   text not null,
  status     text not null default 'pending'
             check (status in ('pending','active','done')),
  created_at timestamptz not null default now()
);

-- 每日課程（學習卡）
create table daily_lessons (
  id          uuid primary key default gen_random_uuid(),
  lesson_date date not null unique,
  chapter_id  uuid not null references chapters(id),
  theme_en    text not null,
  theme_zh    text not null,
  content     jsonb not null,                -- content schema v2（lesson-schema.ts 為唯一定義）
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create unique index daily_lessons_theme_key on daily_lessons (lower(theme_en));

-- 主題預排（月曆分頁「看未來」的資料來源；routine 每日補足未來 7 天）
create table theme_plan (
  id         uuid primary key default gen_random_uuid(),
  plan_date  date not null unique,
  chapter_id uuid not null references chapters(id),
  title_en   text not null,
  title_zh   text not null,
  status     text not null default 'planned'
             check (status in ('planned','used')),
  created_at timestamptz not null default now()
);
create unique index theme_plan_title_key on theme_plan (lower(title_en));

-- 詞彙（學習卡 vocab[] 拆出；用途：生成時的近期詞彙去重）
create table vocab_items (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references daily_lessons(id) on delete cascade,
  word        text not null,
  pos         text,
  phonetic    text,
  meaning     text not null,
  example     text,
  collocation text,
  created_at  timestamptz not null default now()
);
create index on vocab_items (lesson_id);

-- RLS：單人站，authenticated 全權；service role 繞過 RLS
alter table chapters enable row level security;
alter table daily_lessons enable row level security;
alter table theme_plan enable row level security;
alter table vocab_items enable row level security;

create policy "authenticated all" on chapters
  for all to authenticated using (true) with check (true);
create policy "authenticated all" on daily_lessons
  for all to authenticated using (true) with check (true);
create policy "authenticated all" on theme_plan
  for all to authenticated using (true) with check (true);
create policy "authenticated all" on vocab_items
  for all to authenticated using (true) with check (true);

-- 明確授權（新版 Supabase 不自動 GRANT）；anon 不授予任何資料表權限
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all privileges on all tables in schema public to service_role;

-- 初版章節 seed：面試/職場/生活 三類輪替（依學習者 profile 客製：
-- Java 後端、航空業 PAX 資料介接、移民署國安審查、MQ/K8s）
insert into chapters (sort_order, title_en, title_zh, category, status) values
  (1,  'Interview: STAR Project Stories',        '面試：STAR 專案故事',       'interview', 'active'),
  (2,  'Work: Meetings & Standups',              '職場：會議與站會',           'work',      'pending'),
  (3,  'Life: Commuting & Getting Around',       '生活：通勤與交通',           'life',      'pending'),
  (4,  'Interview: System Design Questions',     '面試：系統設計與架構題',     'interview', 'pending'),
  (5,  'Work: Email & Instant Messaging',        '職場：Email 與即時訊息',     'work',      'pending'),
  (6,  'Life: Eating Out',                       '生活：餐廳與點餐',           'life',      'pending'),
  (7,  'Interview: Behavioral & Teamwork',       '面試：行為題與團隊合作',     'interview', 'pending'),
  (8,  'Work: Incidents & On-call',              '職場：維運告警與事故處理',   'work',      'pending'),
  (9,  'Life: Groceries & Shopping',             '生活：超市與採買',           'life',      'pending'),
  (10, 'Interview: Salary & Offer Negotiation',  '面試：薪資與 Offer 談判',    'interview', 'pending'),
  (11, 'Work: Cross-team Collaboration',         '職場：跨部門協作與需求',     'work',      'pending'),
  (12, 'Life: Travel & Airports',                '生活：旅行與機場',           'life',      'pending');

-- ── 音訊：每句一個 MP3，生成當下隨機配音（voice 一併記錄） ──
create table lesson_audio (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references daily_lessons(id) on delete cascade,
  clip_key    text not null,     -- 對齊 UI 播放鍵：m0v1 / kp0 / dlg2 / exercise / v3
  voice       text not null,     -- Kokoro voice id，如 af_heart
  path        text not null,     -- Storage 路徑
  duration_ms int,
  created_at  timestamptz not null default now(),
  unique (lesson_id, clip_key)
);
create index on lesson_audio (lesson_id);

alter table lesson_audio enable row level security;
create policy "authenticated all" on lesson_audio
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on lesson_audio to authenticated;
grant all privileges on lesson_audio to service_role;

-- 音檔 bucket（public read：內容非敏感，走 CDN 最單純；寫入僅 service role）
insert into storage.buckets (id, name, public)
values ('lesson-audio', 'lesson-audio', true)
on conflict (id) do nothing;

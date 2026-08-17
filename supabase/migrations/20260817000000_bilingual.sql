-- ════════════════════════════════════════════════════════════════
-- 雙語 + 多使用者 + 集中期
--
-- 三個維度的改變：
--   1. 語言：卡片從「一天一張」變成「人 × 語言 × 日期 一張」
--   2. 使用者：每張表帶 user_id，RLS 從「登入即全開」改成只看自己的
--   3. 集中期：chapters（寫死 12 章、固定 7 課）換成使用者可控的 focus_blocks
-- ════════════════════════════════════════════════════════════════

create type lang as enum ('en', 'ja');

-- ── 個人設定 ─────────────────────────────────────────────────────
-- 背景與主題勾選都不綁語言：你是航空業 Java 工程師這件事，講英文講日文都一樣
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  background_zh text,                                   -- 面試／職場的個人化素材
  langs       lang[] not null default '{en}',           -- 啟用哪幾種語言
  primary_lang lang not null default 'en',              -- 進站預設看哪一種
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 主題目錄 ─────────────────────────────────────────────────────
-- owner_id 為 null = 系統預設，使用者都看得到；非 null = 該使用者自訂
create table topics (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references auth.users(id) on delete cascade,
  title_zh   text not null,
  category   text not null,                             -- interview / work / life / travel
  -- 這類主題的變體軸長什麼樣。旅遊與生活的「三種說法」跟面試不是同一回事，
  -- 生成端要照這個填，不能一律套用面試的軸。
  axis_hint_zh text,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);
create unique index topics_owner_title_key
  on topics (coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(title_zh));

create table user_topics (
  user_id  uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (user_id, topic_id)
);

-- ── 集中期（取代 chapters）────────────────────────────────────────
-- 政策層：這段期間要練什麼。theme_plan 是它展開後的結果。
create table focus_blocks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  lang       lang not null,
  topic_id   uuid not null references topics(id) on delete cascade,
  starts_on  date not null,
  ends_on    date not null,
  source     text not null default 'user' check (source in ('user', 'auto')),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index on focus_blocks (user_id, lang, starts_on, ends_on);

-- ── 既有表加上人與語言 ────────────────────────────────────────────
alter table daily_lessons
  add column user_id uuid references auth.users(id) on delete cascade,
  add column lang lang not null default 'en',
  add column topic_id uuid references topics(id) on delete set null,
  add column register text;                             -- 日文：です・ます／敬語／くだけた

alter table theme_plan
  add column user_id uuid references auth.users(id) on delete cascade,
  add column lang lang not null default 'en',
  add column topic_id uuid references topics(id) on delete set null,
  add column source text not null default 'auto' check (source in ('user', 'auto'));

-- 回填給既有的唯一使用者，然後才能設 not null
update daily_lessons set user_id = (select id from auth.users order by created_at limit 1)
  where user_id is null;
update theme_plan set user_id = (select id from auth.users order by created_at limit 1)
  where user_id is null;

alter table daily_lessons alter column user_id set not null;
alter table theme_plan   alter column user_id set not null;

-- 唯一性從「全域」改成「依人依語言」
drop index if exists daily_lessons_theme_key;
drop index if exists theme_plan_title_key;
alter table daily_lessons drop constraint if exists daily_lessons_lesson_date_key;
alter table theme_plan    drop constraint if exists theme_plan_plan_date_key;

create unique index daily_lessons_slot_key on daily_lessons (user_id, lang, lesson_date);
create unique index daily_lessons_theme_key on daily_lessons (user_id, lang, lower(theme_en));
create unique index theme_plan_slot_key on theme_plan (user_id, lang, plan_date);

-- chapter_id 不再強制：集中期接手它的角色，舊資料保留參照
alter table daily_lessons alter column chapter_id drop not null;
alter table theme_plan    alter column chapter_id drop not null;

-- ── RLS：從「登入即全開」改成只看自己的 ─────────────────────────────
alter table profiles     enable row level security;
alter table topics       enable row level security;
alter table user_topics  enable row level security;
alter table focus_blocks enable row level security;

drop policy if exists "authenticated all" on daily_lessons;
drop policy if exists "authenticated all" on theme_plan;
drop policy if exists "authenticated all" on vocab_items;
drop policy if exists "authenticated all" on lesson_audio;

create policy "own rows" on daily_lessons for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on theme_plan for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on focus_blocks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own profile" on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "own picks" on user_topics for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 主題：看得到系統預設與自己建的；只能改自己建的
create policy "read presets and own" on topics for select to authenticated
  using (owner_id is null or owner_id = auth.uid());
create policy "write own" on topics for insert to authenticated
  with check (owner_id = auth.uid());
create policy "update own" on topics for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "delete own" on topics for delete to authenticated
  using (owner_id = auth.uid());

-- 子表跟著母表的擁有者
create policy "own rows" on vocab_items for all to authenticated
  using (exists (select 1 from daily_lessons l
                 where l.id = vocab_items.lesson_id and l.user_id = auth.uid()));
create policy "own rows" on lesson_audio for all to authenticated
  using (exists (select 1 from daily_lessons l
                 where l.id = lesson_audio.lesson_id and l.user_id = auth.uid()));

grant select, insert, update, delete
  on profiles, topics, user_topics, focus_blocks to authenticated;
grant all privileges on profiles, topics, user_topics, focus_blocks to service_role;

-- ── 訪客：日常語句，各語言 5 句，種一次就好 ──────────────────────────
create table guest_phrases (
  id         uuid primary key default gen_random_uuid(),
  lang       lang not null,
  sort_order int not null,
  target     text not null,                             -- 目標語言的句子
  reading    text,                                      -- 日文假名
  zh         text not null,
  audio_path text,
  unique (lang, sort_order)
);
alter table guest_phrases enable row level security;
create policy "anyone reads" on guest_phrases for select to anon, authenticated using (true);
grant select on guest_phrases to anon, authenticated;
grant all privileges on guest_phrases to service_role;

-- ── 預設主題 ─────────────────────────────────────────────────────
insert into topics (owner_id, title_zh, category, axis_hint_zh, sort_order) values
  (null, '面試：講自己的專案', 'interview',
   '三種說法都在です・ます＋謙譲語底下；差別在資訊密度與斷定度', 10),
  (null, '面試：談失敗與學到什麼', 'interview',
   '同上；換角度那格練「把失敗講成判斷依據」', 20),
  (null, '職場：說明技術決策', 'work',
   '對內同事用普通體、對外用です・ます；軸是「講結論 vs 講過程」', 30),
  (null, '職場：跟進度與推回時程', 'work',
   'クッション言葉的厚度就是這個主題的軸', 40),
  (null, '生活：日常閒聊', 'life',
   'くだけた為主；軸是終助詞與縮約形的自然度，不是丁寧度', 50),
  (null, '生活：看醫生與買東西', 'life',
   '你說です・ます，對方說敬語；重點在聽懂而不是產出', 60),
  (null, '旅遊：機場與交通', 'travel',
   '定型句為主；敬語出現在站員那一側，學習重心在對話段', 70),
  (null, '旅遊：住宿與點餐', 'travel',
   '同上；換角度那格練「聽不懂時怎麼問」', 80);

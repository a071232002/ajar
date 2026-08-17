-- chapters 退役。
--
-- 章節原本負責兩件事：把主題分類，以及決定「現在在練哪一段」。雙語改版之後
-- 前者由 topics.category 接手、後者由 focus_blocks 接手，chapters 就只剩下
-- 一張沒有寫入端的表，和兩個永遠是 null 的外鍵欄位——卡片上的分類還因此空掉過。
--
-- 這一步會刪資料。雙語改版後產出的卡片 chapter_id 都是 null（本機已確認），
-- 但若正式站還留著改版前的卡，它們與章節的關聯會在這裡消失——所以先數一次，
-- 有殘留就中止，讓人決定要不要保。

do $$
declare n int;
begin
  select count(*) into n from daily_lessons where chapter_id is not null;
  if n > 0 then
    raise exception '還有 % 張卡片綁著章節，先確認要不要保留這段關聯再執行本 migration', n;
  end if;
end $$;

alter table daily_lessons drop column if exists chapter_id;
alter table theme_plan drop column if exists chapter_id;

drop table if exists chapters;

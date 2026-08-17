-- 訪客頁的內容：英日各五句。
--
-- 挑句原則跟學習卡一致——要是母語者真的會講的，不是課本例句。所以有縮約、有
-- クッション言葉，沒有「これはペンです」那種。日文五句沿用先前語音試聽已經驗
-- 過發音的那組（旅遊／生活情境）。
--
-- audio_path 先留 null，由 scripts/generate-audio.mjs --guest 與
-- scripts/generate-audio-ja.py --guest 產完音檔後回填。

insert into guest_phrases (lang, sort_order, target, reading, zh) values
  ('en', 10, 'Could you run that by me one more time?', null,
   '可以再跟我說一次嗎？（比 Say again? 客氣，開會聽漏時最常用）'),
  ('en', 20, 'I''m just browsing, thanks.', null,
   '我只是看看，謝謝。（店員上前招呼時的標準回法）'),
  ('en', 30, 'Do you want to grab a bite after this?', null,
   '這個結束後要不要去吃點東西？（grab a bite 比 have dinner 隨性）'),
  ('en', 40, 'Sorry, my bad — I''ll get it fixed.', null,
   '抱歉，我的錯，我來處理。（my bad 是認錯但不小題大作）'),
  ('en', 50, 'Any chance we could push it to next week?', null,
   '有沒有可能延到下週？（Any chance 把要求包成詢問，推時程好用）'),

  ('ja', 10, 'すみません、この電車は空港に行きますか。',
   'すみません、このでんしゃはくうこうにいきますか。',
   '不好意思，這班電車有到機場嗎？'),
  ('ja', 20, 'チェックインをお願いします。予約はしてあります。',
   'チェックインをおねがいします。よやくはしてあります。',
   '我要辦入住，已經訂好了。（してあります＝事情已經先處理好的狀態）'),
  ('ja', 30, 'お会計は別々でお願いできますか。',
   'おかいけいはべつべつでおねがいできますか。',
   '可以分開結帳嗎？'),
  ('ja', 40, 'この近くにコンビニはありますか。',
   'このちかくにコンビニはありますか。',
   '這附近有便利商店嗎？'),
  ('ja', 50, 'すみません、もう一度ゆっくり言っていただけますか。',
   'すみません、もういちどゆっくりいっていただけますか。',
   '不好意思，可以再慢慢說一次嗎？（聽不懂時最實用的一句）')
on conflict (lang, sort_order) do update set
  target  = excluded.target,
  reading = excluded.reading,
  zh      = excluded.zh;

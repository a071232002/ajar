import { revalidateTag } from "next/cache";
import { TAG_LESSONS, TAG_PLANS } from "@/lib/lesson-data";
import { advanceChapterIfComplete } from "@/lib/chapters";
import { taipeiToday } from "@/lib/date";
import { lessonSubmissionSchema } from "@/lib/lesson-schema";
import { isAuthorizedMachine, unauthorized } from "@/lib/machine-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * routine 生成完學習卡後提交。三層防重複的第二、三層在此：
 * 伺服端檢查 + DB unique 約束（lesson_date、lower(theme_en)）。
 */
export async function POST(request: Request) {
  if (!isAuthorizedMachine(request)) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "body 不是合法 JSON" }, { status: 400 });
  }

  const parsed = lessonSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "學習卡格式驗證失敗", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { chapter_id, content, replace } = parsed.data;
  const db = createAdminClient();
  const today = taipeiToday();

  const { data: chapter } = await db
    .from("chapters")
    .select("id")
    .eq("id", chapter_id)
    .maybeSingle();
  if (!chapter) {
    return Response.json({ error: "chapter_id 不存在" }, { status: 400 });
  }

  // 明確要求覆寫時才刪。vocab_items 與 lesson_audio 靠 FK cascade 清掉，但 storage
  // 的檔案不會跟著走（路徑是 {lesson_id}/{clip}.mp3，新卡是新 id），要自己收。
  if (replace) {
    const { data: stale } = await db
      .from("daily_lessons")
      .select("id")
      .eq("lesson_date", today)
      .maybeSingle();

    if (stale) {
      const { data: files } = await db.storage.from("lesson-audio").list(stale.id);
      if (files?.length) {
        await db.storage
          .from("lesson-audio")
          .remove(files.map((f) => `${stale.id}/${f.name}`));
      }
      await db.from("daily_lessons").delete().eq("id", stale.id);
    }
  }

  const { data: lesson, error: insertError } = await db
    .from("daily_lessons")
    .insert({
      lesson_date: today,
      chapter_id,
      theme_en: content.theme.en,
      theme_zh: content.theme.zh,
      content,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return Response.json(
        { error: "重複：今日卡片已存在，或主題已被使用過", detail: insertError.message },
        { status: 409 },
      );
    }
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  // vocab 入庫的用途：之後生成時的近期詞彙去重（brief.recent_words）
  const { error: vocabError } = await db.from("vocab_items").insert(
    content.vocab.map((v) => ({
      lesson_id: lesson.id,
      word: v.phrase,
      pos: v.pos ?? null,
      phonetic: v.phonetic ?? null,
      meaning: v.meaning_zh,
      example: v.example_en ?? null,
      collocation: v.collocation ?? null,
    })),
  );
  if (vocabError) {
    return Response.json({ error: vocabError.message }, { status: 500 });
  }

  // 今日若有預排主題，標記為已使用（不論實際主題是否一字不差）
  await db
    .from("theme_plan")
    .update({ status: "used" })
    .eq("plan_date", today)
    .eq("status", "planned");

  await advanceChapterIfComplete(db, chapter_id);

  // 讀取路徑有快取，寫完必須清掉，否則網站會一直顯示舊卡
  revalidateTag(TAG_LESSONS);
  revalidateTag(TAG_PLANS);

  return Response.json({ lesson_id: lesson.id, lesson_date: today }, { status: 201 });
}

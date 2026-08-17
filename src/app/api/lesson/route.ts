import { revalidateTag } from "next/cache";
import { TAG_LESSONS, TAG_PLANS } from "@/lib/lesson-data";
import { taipeiToday } from "@/lib/date";
import { lessonSubmissionSchema } from "@/lib/lesson-schema";
import { isAuthorizedMachine, unauthorized } from "@/lib/machine-auth";
import { resolveOwner } from "@/lib/machine-user";
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

  const { content, replace, lang, topic_id, register } = parsed.data;
  const db = createAdminClient();
  const today = taipeiToday();

  const owner = await resolveOwner(db, parsed.data.user_id);
  if ("error" in owner) return Response.json({ error: owner.error }, { status: 400 });

  // 主題沒帶就從當天的預排補。prompt 有叫排程帶 topic_id，但它是選填、實測兩張卡
  // 都沒帶，卡片上的分類就整條空掉。分類是預排時就決定好的事，不該靠生成端記得。
  let topicId = topic_id ?? null;
  if (!topicId) {
    const { data: planned } = await db
      .from("theme_plan")
      .select("topic_id")
      .eq("user_id", owner.userId).eq("lang", lang).eq("plan_date", today)
      .maybeSingle<{ topic_id: string | null }>();
    topicId = planned?.topic_id ?? null;
  }


  // 明確要求覆寫時才刪。vocab_items 與 lesson_audio 靠 FK cascade 清掉，但 storage
  // 的檔案不會跟著走（路徑是 {lesson_id}/{clip}.mp3，新卡是新 id），要自己收。
  if (replace) {
    const { data: stale } = await db
      .from("daily_lessons")
      .select("id")
      .eq("user_id", owner.userId).eq("lang", lang).eq("lesson_date", today)
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
      user_id: owner.userId,
      lang,
      topic_id: topicId,
      register: register ?? null,
      lesson_date: today,
      theme_en: content.theme.en,
      theme_zh: content.theme.zh,
      content,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      // 兩種撞法要分開講：撞今天的位置代表今天已經有卡（該停），撞主題代表這個
      // 主題以前練過（該換一個重送）。混在一起講的話產卡端只能放棄，白白少一天。
      const themeClash = insertError.message.includes("theme");
      return Response.json(
        {
          error: themeClash
            ? `主題「${content.theme.en}」以前用過了，換一個重送`
            : "今天這個語言已經有卡片了；要覆蓋請帶 replace: true",
          conflict: themeClash ? "theme" : "slot",
          theme_en: themeClash ? content.theme.en : undefined,
          detail: insertError.message,
        },
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
    .eq("user_id", owner.userId).eq("lang", lang).eq("plan_date", today)
    .eq("status", "planned");


  // 讀取路徑有快取，寫完必須清掉，否則網站會一直顯示舊卡
  revalidateTag(TAG_LESSONS);
  revalidateTag(TAG_PLANS);

  return Response.json({ lesson_id: lesson.id, lesson_date: today }, { status: 201 });
}

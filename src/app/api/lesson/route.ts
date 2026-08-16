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

  const { chapter_id, content } = parsed.data;
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

  return Response.json({ lesson_id: lesson.id, lesson_date: today }, { status: 201 });
}

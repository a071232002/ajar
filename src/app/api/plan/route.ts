import { revalidateTag } from "next/cache";
import { TAG_PLANS } from "@/lib/lesson-data";
import { getOrPromoteActiveChapter } from "@/lib/chapters";
import { taipeiToday } from "@/lib/date";
import { planSubmissionSchema } from "@/lib/lesson-schema";
import { isAuthorizedMachine, unauthorized } from "@/lib/machine-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * 主題預排：月曆「看未來」的資料。routine 每日補足未來 7 天；
 * 也可由任何持 CRON_SECRET 的呼叫者改排（例：「下週集中練 K8s 面試題」）。
 * 以 plan_date upsert：同日重排 = 覆蓋。
 */
export async function POST(request: Request) {
  if (!isAuthorizedMachine(request)) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "body 不是合法 JSON" }, { status: 400 });
  }

  const parsed = planSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "預排格式驗證失敗", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const db = createAdminClient();
  const today = taipeiToday();

  const past = parsed.data.plans.filter((p) => p.date < today);
  if (past.length > 0) {
    return Response.json(
      { error: `不可預排過去日期：${past.map((p) => p.date).join(", ")}` },
      { status: 400 },
    );
  }

  const fallbackChapter = await getOrPromoteActiveChapter(db);

  const rows = parsed.data.plans.map((p) => ({
    plan_date: p.date,
    chapter_id: p.chapter_id ?? fallbackChapter?.id,
    title_en: p.title_en,
    title_zh: p.title_zh,
    status: "planned" as const,
  }));
  if (rows.some((r) => !r.chapter_id)) {
    return Response.json(
      { error: "沒有可用章節（chapter_id 未指定且無 active/pending 章節）" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("theme_plan")
    .upsert(rows, { onConflict: "plan_date" })
    .select("plan_date");

  if (error) {
    if (error.code === "23505") {
      return Response.json(
        { error: "預排主題與既有主題重複（title 需全站唯一）", detail: error.message },
        { status: 409 },
      );
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(TAG_PLANS);

  return Response.json({ upserted: data?.length ?? 0 }, { status: 201 });
}

/** 檢視預排（今天起） */
export async function GET(request: Request) {
  if (!isAuthorizedMachine(request)) return unauthorized();

  const db = createAdminClient();
  const { data } = await db
    .from("theme_plan")
    .select("plan_date, chapter_id, title_en, title_zh, status")
    .gte("plan_date", taipeiToday())
    .order("plan_date");

  return Response.json({ plans: data ?? [] });
}

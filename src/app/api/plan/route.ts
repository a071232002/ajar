import { revalidateTag } from "next/cache";
import { TAG_PLANS } from "@/lib/lesson-data";
import { taipeiToday } from "@/lib/date";
import { planSubmissionSchema } from "@/lib/lesson-schema";
import { resolveOwner } from "@/lib/machine-user";
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

  const owner = await resolveOwner(db, parsed.data.user_id);
  if ("error" in owner) return Response.json({ error: owner.error }, { status: 400 });
  const lang = parsed.data.lang;

  const past = parsed.data.plans.filter((p) => p.date < today);
  if (past.length > 0) {
    return Response.json(
      { error: `不可預排過去日期：${past.map((p) => p.date).join(", ")}` },
      { status: 400 },
    );
  }

  // 排程補的一律 source='auto'；使用者在行事曆上排的走 server action，那邊寫 'user'，
  // 這裡的 upsert 不會覆蓋到它們（下面有 source 條件）
  const rows = parsed.data.plans.map((p) => ({
    user_id: owner.userId,
    lang,
    plan_date: p.date,
    topic_id: p.topic_id ?? null,
    chapter_id: p.chapter_id ?? null,
    title_en: p.title_en,
    title_zh: p.title_zh,
    status: "planned" as const,
    source: "auto" as const,
  }));

  // 使用者手動指定的日子不得被排程蓋掉
  const { data: locked } = await db
    .from("theme_plan")
    .select("plan_date")
    .eq("user_id", owner.userId)
    .eq("lang", lang)
    .eq("source", "user")
    .in("plan_date", rows.map((r) => r.plan_date));
  const lockedDates = new Set((locked ?? []).map((l) => l.plan_date));
  const writable = rows.filter((r) => !lockedDates.has(r.plan_date));
  if (writable.length === 0) {
    return Response.json({ upserted: 0, skipped_user_plans: [...lockedDates] }, { status: 201 });
  }

  const { data, error } = await db
    .from("theme_plan")
    .upsert(writable, { onConflict: "user_id,lang,plan_date" })
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

  return Response.json(
    { upserted: data?.length ?? 0, skipped_user_plans: [...lockedDates] },
    { status: 201 },
  );
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

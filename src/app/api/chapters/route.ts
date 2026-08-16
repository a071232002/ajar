import { chaptersSubmissionSchema } from "@/lib/lesson-schema";
import { isAuthorizedMachine, unauthorized } from "@/lib/machine-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * 新增章節（不需改程式碼即可擴充主題）。
 * 呼叫者：routine（跑完一輪自動補下一輪）、或任何持 CRON_SECRET 的工具。
 */
export async function POST(request: Request) {
  if (!isAuthorizedMachine(request)) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "body 不是合法 JSON" }, { status: 400 });
  }

  const parsed = chaptersSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "章節格式驗證失敗", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const db = createAdminClient();

  const { data: maxRow } = await db
    .from("chapters")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();
  const base = maxRow?.sort_order ?? 0;

  const { data, error } = await db
    .from("chapters")
    .insert(
      parsed.data.chapters.map((c, i) => ({
        sort_order: base + 1 + i,
        title_en: c.title_en,
        title_zh: c.title_zh,
        category: c.category,
      })),
    )
    .select("id");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ inserted: data?.length ?? 0 }, { status: 201 });
}

/** 供 routine / 工具檢視章節進度 */
export async function GET(request: Request) {
  if (!isAuthorizedMachine(request)) return unauthorized();

  const db = createAdminClient();
  const { data } = await db
    .from("chapters")
    .select("id, sort_order, title_en, title_zh, category, status")
    .order("sort_order");

  return Response.json({ chapters: data ?? [] });
}

import { revalidateTag } from "next/cache";
import { TAG_GUEST } from "@/lib/guest-data";
import { TAG_LESSONS, TAG_PLANS } from "@/lib/lesson-data";
import { isAuthorizedMachine, unauthorized } from "@/lib/machine-auth";

export const dynamic = "force-dynamic";

const KNOWN = new Set([TAG_LESSONS, TAG_PLANS, TAG_GUEST]);

/**
 * 讓「繞過本站直接寫 Supabase」的流程能清掉讀取快取。
 * 目前的使用者：GitHub Actions 補完音檔之後（音檔不經過本站的任何寫入端），
 * 以及 E2E 直接用 REST 改資料之後。
 *
 * body: { "tags": ["lessons", "plans"] }；省略 tags 就全清。
 */
export async function POST(request: Request) {
  if (!isAuthorizedMachine(request)) return unauthorized();

  let tags: string[] = [...KNOWN];
  try {
    const body = await request.json();
    if (Array.isArray(body?.tags)) {
      tags = body.tags.filter((t: unknown): t is string => typeof t === "string");
    }
  } catch {
    // 沒帶 body 就是全清
  }

  const unknown = tags.filter((t) => !KNOWN.has(t));
  if (unknown.length) {
    return Response.json(
      { error: `未知的 tag：${unknown.join(", ")}`, known: [...KNOWN] },
      { status: 400 },
    );
  }

  tags.forEach((t) => revalidateTag(t));
  return Response.json({ revalidated: tags });
}

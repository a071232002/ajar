"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { taipeiToday } from "@/lib/date";
import { isLang } from "@/lib/lang";
import { TAG_PLANS } from "@/lib/lesson-data";
import { createClient } from "@/lib/supabase/server";

/**
 * 導回原本那一頁。
 * 只做 revalidateTag/revalidatePath 不夠：客戶端的 Router Cache 還留著
 * 帶 ?d= 的舊項目，畫面要 reload 才會變。從 server action 發 redirect
 * 會走一次真正的導覽，快取才會被換掉。
 */
function backTo(formData: FormData, lang: string): string {
  const raw = String(formData.get("back") ?? "");
  return raw.startsWith(`/${lang}/calendar`) ? raw : `/${lang}/calendar`;
}

async function requireUser() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("未登入");
  return { db, user };
}

/**
 * 集中期：這段期間都練同一個主題。
 * 這是政策層——排程之後會把它展開成每一天的 theme_plan。
 */
export async function createFocusBlock(formData: FormData) {
  const { db, user } = await requireUser();

  const lang = String(formData.get("lang"));
  const topicId = String(formData.get("topic_id"));
  const startsOn = String(formData.get("starts_on"));
  const days = Number(formData.get("days"));

  if (!isLang(lang) || !topicId || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) return;
  if (!Number.isFinite(days) || days < 1 || days > 90) return;
  // 排過去的日子沒有意義——那些天的卡片早就產完了
  if (startsOn < taipeiToday()) return;

  const end = new Date(`${startsOn}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + days - 1);

  await db.from("focus_blocks").insert({
    user_id: user.id,
    lang,
    topic_id: topicId,
    starts_on: startsOn,
    ends_on: end.toISOString().slice(0, 10),
    source: "user",
  });

  revalidateTag(TAG_PLANS);
  revalidatePath("/", "layout");
  redirect(backTo(formData, lang));
}

export async function deleteFocusBlock(formData: FormData) {
  const { db } = await requireUser();
  const id = String(formData.get("id"));
  const lang = String(formData.get("lang"));
  if (!id) return;

  await db.from("focus_blocks").delete().eq("id", id);
  revalidateTag(TAG_PLANS);
  revalidatePath("/", "layout");
  if (isLang(lang)) redirect(backTo(formData, lang));
}

/**
 * 單日指定主題。這是逃生門：集中期是主要操作，但偶爾就是想在某一天插一個題目。
 * source='user' 之後排程不得覆蓋。
 */
export async function setDayPlan(formData: FormData) {
  const { db, user } = await requireUser();

  const lang = String(formData.get("lang"));
  const date = String(formData.get("date"));
  const topicId = String(formData.get("topic_id"));
  const titleZh = String(formData.get("title_zh") ?? "").trim();

  if (!isLang(lang) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  if (date < taipeiToday()) return;
  if (!topicId && !titleZh) return;

  await db.from("theme_plan").upsert(
    {
      user_id: user.id,
      lang,
      plan_date: date,
      topic_id: topicId || null,
      title_zh: titleZh || "（依主題臨場發想）",
      title_en: `user-${date}-${lang}`,
      status: "planned",
      source: "user",
    },
    { onConflict: "user_id,lang,plan_date" },
  );

  revalidateTag(TAG_PLANS);
  revalidatePath("/", "layout");
}

export async function clearDayPlan(formData: FormData) {
  const { db } = await requireUser();
  const lang = String(formData.get("lang"));
  const date = String(formData.get("date"));
  if (!isLang(lang) || !date) return;

  await db.from("theme_plan").delete().eq("lang", lang).eq("plan_date", date);
  revalidateTag(TAG_PLANS);
  revalidatePath("/", "layout");
}

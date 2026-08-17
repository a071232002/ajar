"use server";

import { revalidatePath } from "next/cache";
import { LANGS, isLang, type Lang } from "@/lib/lang";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("未登入");
  return { db, user };
}

/** 語言、個人背景 */
export async function saveProfile(formData: FormData) {
  const { db, user } = await requireUser();

  const langs = LANGS.filter((l) => formData.get(`lang-${l}`) === "on");
  // 一種都不選會讓整個站沒東西可看，擋在這裡而不是讓它變成空畫面
  const finalLangs: Lang[] = langs.length > 0 ? langs : ["en"];

  const rawPrimary = formData.get("primary_lang");
  const primary: Lang =
    isLang(rawPrimary) && finalLangs.includes(rawPrimary) ? rawPrimary : finalLangs[0];

  await db.from("profiles").upsert({
    id: user.id,
    background_zh: String(formData.get("background_zh") ?? "").trim() || null,
    langs: finalLangs,
    primary_lang: primary,
    updated_at: new Date().toISOString(),
  });

  revalidatePath("/", "layout");
}

/** 主題勾選：整組覆寫，比逐一增刪好推理 */
export async function saveTopicPicks(formData: FormData) {
  const { db, user } = await requireUser();
  const picked = formData.getAll("topic").map(String);

  await db.from("user_topics").delete().eq("user_id", user.id);
  if (picked.length) {
    await db
      .from("user_topics")
      .insert(picked.map((topic_id) => ({ user_id: user.id, topic_id })));
  }
  revalidatePath("/", "layout");
}

/** 自訂主題 */
export async function addTopic(formData: FormData) {
  const { db, user } = await requireUser();
  const title = String(formData.get("title_zh") ?? "").trim();
  const category = String(formData.get("category") ?? "life").trim();
  if (!title) return;

  const { data } = await db
    .from("topics")
    .insert({ owner_id: user.id, title_zh: title, category, sort_order: 500 })
    .select("id")
    .single<{ id: string }>();

  // 自己新增的預設就勾起來——不然還要再點一次才會生效
  if (data) {
    await db.from("user_topics").insert({ user_id: user.id, topic_id: data.id });
  }
  revalidatePath("/", "layout");
}

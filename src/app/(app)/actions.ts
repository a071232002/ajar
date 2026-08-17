"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { TAG_LESSONS } from "@/lib/lesson-data";
import { createClient } from "@/lib/supabase/server";

/** 〔讀完了〕：只記第一次（read_at 已有值就不覆蓋） */
export async function markLessonRead(lessonId: string) {
  const supabase = await createClient();
  await supabase
    .from("daily_lessons")
    .update({ read_at: new Date().toISOString() })
    .eq("id", lessonId)
    .is("read_at", null);
  revalidateTag(TAG_LESSONS);
  revalidatePath("/");
  revalidatePath("/calendar");
}

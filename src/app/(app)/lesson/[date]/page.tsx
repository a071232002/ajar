import { notFound } from "next/navigation";
import LessonView, { type LessonRow } from "@/components/LessonView";
import { lessonAudioUrls } from "@/lib/audio";
import { categoryZh } from "@/lib/categories";
import { diffDays } from "@/lib/date";
import { neighborLessonDates } from "@/lib/lesson-nav";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = LessonRow & { chapters: { category: string } | null };

export default async function LessonByDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("daily_lessons")
    .select("id, lesson_date, theme_en, theme_zh, content, read_at, chapters(category)")
    .eq("lesson_date", date)
    .maybeSingle<Row>();

  if (!lesson) notFound();

  const [{ data: first }, { prevDate, nextDate }, audioUrls] = await Promise.all([
    supabase
      .from("daily_lessons")
      .select("lesson_date")
      .order("lesson_date", { ascending: true })
      .limit(1)
      .single<{ lesson_date: string }>(),
    neighborLessonDates(supabase, lesson.lesson_date),
    lessonAudioUrls(supabase, lesson.id),
  ]);

  const dayNumber = first
    ? diffDays(lesson.lesson_date, first.lesson_date) + 1
    : 1;

  return (
    <LessonView
      lesson={lesson}
      dayNumber={dayNumber}
      categoryZh={categoryZh(lesson.chapters?.category ?? "")}
      prevDate={prevDate}
      nextDate={nextDate}
      audioUrls={audioUrls}
    />
  );
}

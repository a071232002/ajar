import { notFound } from "next/navigation";
import LessonView from "@/components/LessonView";
import { categoryZh } from "@/lib/categories";
import { diffDays } from "@/lib/date";
import {
  getAudioUrls,
  getFirstLessonDate,
  getLesson,
  getNeighborDates,
} from "@/lib/lesson-data";

export const dynamic = "force-dynamic";

export default async function LessonByDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const lesson = await getLesson(date);
  if (!lesson) notFound();

  const [first, { prevDate, nextDate }, audioUrls] = await Promise.all([
    getFirstLessonDate(),
    getNeighborDates(lesson.lesson_date),
    getAudioUrls(lesson.id),
  ]);

  const dayNumber = first ? diffDays(lesson.lesson_date, first) + 1 : 1;

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

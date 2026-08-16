import { z } from "zod";

/**
 * 學習卡 content schema v2 —— 全站唯一定義（API 驗證與前端型別同源）。
 * 形態對齊使用者既有排程產出的「英文學習卡」：
 * 意思段（三說法變體）→ Key Point → 對話 → 情境練習 → 詞彙。
 */

export const VARIANT_STYLES = ["direct", "natural", "angle"] as const;
export const VARIANT_LABELS: Record<(typeof VARIANT_STYLES)[number], string> = {
  direct: "直接",
  natural: "自然",
  angle: "換角度",
};

export const lessonContentSchema = z.object({
  schema_version: z.literal(2),
  theme: z.object({ en: z.string().min(1), zh: z.string().min(1) }),
  /** 副標：這張卡的溝通目標，如「用 STAR 把專案講成 90 秒的故事」 */
  goal_zh: z.string().min(1),
  meanings: z
    .array(
      z.object({
        title_zh: z.string().min(1),
        variants: z
          .array(
            z.object({
              style: z.enum(VARIANT_STYLES),
              en: z.string().min(1),
              note_zh: z.string().min(1),
            }),
          )
          .min(2)
          .max(3),
      }),
    )
    .min(1)
    .max(4),
  key_points: z
    .array(
      z.object({
        title_zh: z.string().min(1),
        explain_zh: z.string().min(1),
        example_en: z.string().min(1),
        example_zh: z.string().min(1),
      }),
    )
    .min(1)
    .max(4),
  dialogue: z
    .array(
      z.object({
        speaker_zh: z.string().min(1).max(12), // 面試官／你／店員…
        side: z.enum(["them", "me"]),
        en: z.string().min(1),
        zh: z.string().min(1),
      }),
    )
    .min(4)
    .max(10),
  exercise: z.object({
    prompt_zh: z.string().min(1),
    model_en: z.string().min(1),
    model_zh: z.string().min(1),
  }),
  /** 進 SM-2 複習佇列的片語 */
  vocab: z
    .array(
      z.object({
        phrase: z.string().min(1),
        pos: z.string().optional(),
        phonetic: z.string().optional(),
        meaning_zh: z.string().min(1),
        example_en: z.string().optional(),
        collocation: z.string().optional(),
      }),
    )
    .min(3)
    .max(6),
});

export type LessonContent = z.infer<typeof lessonContentSchema>;

/** POST /api/lesson */
export const lessonSubmissionSchema = z.object({
  chapter_id: z.string().uuid(),
  content: lessonContentSchema,
});

/** POST /api/chapters（category 自由文字，主題分類不寫死） */
export const chaptersSubmissionSchema = z.object({
  chapters: z
    .array(
      z.object({
        title_en: z.string().min(1),
        title_zh: z.string().min(1),
        category: z.string().min(1).max(32),
      }),
    )
    .min(1)
    .max(24),
});

/** POST /api/plan（未來主題預排；月曆分頁「看未來」的資料） */
export const planSubmissionSchema = z.object({
  plans: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        chapter_id: z.string().uuid().optional(), // 省略 = 當前 active 章節
        title_en: z.string().min(1),
        title_zh: z.string().min(1),
      }),
    )
    .min(1)
    .max(31),
});

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

/**
 * 句型標記：英文句子用 **…** 圈住要記的句型，前端渲染成螢光筆，TTS 前會剝掉。
 * 產卡端漏標時整張卡就沒有重點可看，所以在 schema 直接擋下來——
 * 每天由排程自動產卡，沒有人會回頭檢查，退 400 讓它重產比較實在。
 */
export const MIN_MARKED_SPANS = 4;
const MARK = /\*\*(.+?)\*\*/g;

const countMarks = (text: string) => (text.match(MARK) ?? []).length;

export const lessonContentBase = z.object({
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

export const lessonContentSchema = lessonContentBase.superRefine((c, ctx) => {
  const marked =
    c.meanings.reduce(
      (n, m) => n + m.variants.reduce((v, x) => v + countMarks(x.en), 0),
      0,
    ) +
    c.key_points.reduce((n, k) => n + countMarks(k.example_en), 0) +
    c.dialogue.reduce((n, d) => n + countMarks(d.en), 0) +
    countMarks(c.exercise.model_en);

  if (marked < MIN_MARKED_SPANS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `英文句子要用 **…** 標出重要句型，整張卡至少 ${MIN_MARKED_SPANS} 處，目前只有 ${marked} 處`,
    });
  }
});

export type LessonContent = z.infer<typeof lessonContentBase>;

/** POST /api/lesson */
export const lessonSubmissionSchema = z.object({
  chapter_id: z.string().uuid(),
  content: lessonContentSchema,
  /**
   * 覆寫今天已存在的卡片。預設 false——排程重跑時要維持 409，不能默默改掉已讀的卡。
   * 存在的理由：每天自動寫一張卡，寫壞了本來沒有任何補救手段，只能等隔天。
   */
  replace: z.boolean().optional().default(false),
});

/** 產卡端每天讀 brief 才動筆，寫作規則就掛在 brief 上，不靠本機文件同步 */
export const WRITING_RULES = [
  `英文句子用 **…** 圈出要背的句型（例：I **owned that piece end to end**.），整張卡至少 ${MIN_MARKED_SPANS} 處，少於此會被退 400。`,
  "只標句型骨架，不要整句包起來；中文不標。",
  "meanings 的三個變體 direct / natural / angle 各自要有不同語感，不是同義改寫。",
] as const;

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

"use client";

import { useState } from "react";
import PlayButton from "@/components/PlayButton";
import type { LessonContent } from "@/lib/lesson-schema";
import { VARIANT_LABELS } from "@/lib/lesson-schema";

type Meaning = LessonContent["meanings"][number];

/** 意思段：直接/自然/換角度 分頁切換（C1 檔案夾頁籤樣式） */
export default function VariantTabs({
  meaning,
  meaningIndex,
}: {
  meaning: Meaning;
  meaningIndex: number;
}) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="flex gap-1.5 border-b-2 border-folder-deep" role="tablist">
        {meaning.variants.map((v, i) => (
          <button
            key={v.style}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`rounded-t-md border border-b-0 border-folder-deep px-4 py-1.5 text-[13.5px] ${
              i === active
                ? "bg-paper font-medium text-ink"
                : "bg-folder-deep text-paper opacity-75 dark:text-ink"
            }`}
          >
            {VARIANT_LABELS[v.style]}
          </button>
        ))}
      </div>
      {meaning.variants.map((v, i) => (
        <div key={v.style} hidden={i !== active} className="pt-4">
          <p className="en">
            {v.en}
            <PlayButton
              id={`m${meaningIndex}v${i}`}
              clipKeys={[`m${meaningIndex}v${i}`]}
            />
          </p>
          <p className="mt-2.5 text-[14.5px] text-soft">※ {v.note_zh}</p>
        </div>
      ))}
    </div>
  );
}

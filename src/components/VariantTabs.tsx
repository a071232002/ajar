"use client";

import { useState } from "react";
import PlayButton from "@/components/PlayButton";
import type { LessonContent } from "@/lib/lesson-schema";
import { VARIANT_LABELS } from "@/lib/lesson-schema";
import { renderMarked } from "@/lib/markup";

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
      <div className="vtablist" role="tablist">
        {meaning.variants.map((v, i) => (
          <button
            key={v.style}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className="vtab"
          >
            {VARIANT_LABELS[v.style]}
          </button>
        ))}
      </div>
      {meaning.variants.map((v, i) => (
        <div key={v.style} hidden={i !== active} className="say-row pt-4">
          <PlayButton
            id={`m${meaningIndex}v${i}`}
            clipKeys={[`m${meaningIndex}v${i}`]}
          />
          <div className="say-body">
            <p className="en">{renderMarked(v.en)}</p>
            <p className="mt-2.5 text-[14.5px] text-soft">※ {v.note_zh}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

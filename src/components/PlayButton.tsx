"use client";

import { toggle, useSpeech } from "@/lib/speech";

/**
 * 播放鍵：▶ 開始、⏸ 暫停、再按續播；換一顆會切過去。
 * round 版固定佔 40px 的左欄版位（.say-slot），句子長短不會讓它跑掉。
 */
/** 喇叭（待播）／暫停（播放中）——用發聲的圖示，不用播放三角形 */
function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden>
      <path
        d="M11.5 4.5 6.8 8.4H3.6v7.2h3.2l4.7 3.9z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M15.4 9.1a4 4 0 0 1 0 5.8M18.1 6.3a7.9 7.9 0 0 1 0 11.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <rect x="7" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" />
    </svg>
  );
}

export default function PlayButton({
  id,
  clipKeys,
  variant = "round",
  label,
}: {
  id: string;
  clipKeys: string[];
  variant?: "round" | "pill";
  label?: string;
}) {
  const { activeKey, paused, available } = useSpeech();

  const playing = activeKey === id && !paused;

  if (variant === "pill") {
    if (!available) return null;
    return (
      <button
        type="button"
        onClick={() => toggle(id, clipKeys)}
        className="flex items-center gap-1.5 rounded-full border-2 border-accent/70 px-3.5 py-1 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-white"
      >
        {playing ? <PauseIcon /> : <SpeakerIcon />}
        {playing ? "暫停" : (label ?? "播放")}
      </button>
    );
  }

  // 不可用時仍保留版位，避免整段文字左右位移
  if (!available) return <span className="say-slot" aria-hidden />;

  return (
    <span className="say-slot">
      <button
        type="button"
        onClick={() => toggle(id, clipKeys)}
        aria-label={playing ? "暫停" : "播放"}
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-[13px] transition-colors ${
          playing
            ? "border-accent bg-accent text-white"
            : "border-accent/70 text-accent hover:bg-accent hover:text-white"
        }`}
      >
        {playing ? <PauseIcon /> : <SpeakerIcon />}
      </button>
    </span>
  );
}

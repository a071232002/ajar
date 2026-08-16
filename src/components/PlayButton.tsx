"use client";

import { toggle, useSpeech } from "@/lib/speech";

/**
 * 播放鈕：▶ 開始、⏸ 暫停、再按續播；換一顆會切過去。
 * clipKeys 對應預先產好的音檔（沒有就自動退回瀏覽器語音）。
 */
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
  if (!available) return null;

  const playing = activeKey === id && !paused;

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={() => toggle(id, clipKeys)}
        className="rounded-full border border-soft/50 bg-paper px-3.5 py-1 text-sm text-ink"
      >
        {playing ? "⏸ 暫停" : `▶ ${label ?? "播放"}`}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggle(id, clipKeys)}
      aria-label={playing ? "暫停" : "播放"}
      className="ml-2 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full border-[1.5px] border-accent align-middle text-[11px] text-accent hover:bg-accent hover:text-paper"
    >
      {playing ? "⏸" : "▶"}
    </button>
  );
}

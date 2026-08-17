"use client";

import { playable, stop, toggle, useSpeech } from "@/lib/speech";

/**
 * 播放鍵：播放／暫停／停止，並顯示進度。
 *
 * 沒有音檔時是停用而不是隱藏——版位要留著，否則整段文字會左右位移；
 * 而且「還沒有語音」是需要讓人看到的狀態，不是應該藏起來的。
 */
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

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  );
}

/** 沿著圓形鍵外緣的進度環 */
function ProgressRing({ value }: { value: number }) {
  const R = 18;
  const C = 2 * Math.PI * R;
  return (
    <svg className="play-ring" viewBox="0 0 40 40" aria-hidden>
      <circle
        cx="20"
        cy="20"
        r={R}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - value)}
      />
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
  const { activeKey, paused, progress, index, total } = useSpeech();

  const active = activeKey === id;
  const playing = active && !paused;
  const ready = playable(clipKeys);

  if (variant === "pill") {
    return (
      <span className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => toggle(id, clipKeys)}
          disabled={!ready}
          aria-label={playing ? "暫停" : (label ?? "播放")}
          title={ready ? undefined : "這張卡的語音還沒產生"}
          className="playbar relative flex items-center gap-1.5 overflow-hidden rounded-full border-2 border-accent/70 px-3.5 py-1 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-accent"
        >
          {active && (
            <span
              className="playbar-fill"
              style={{ transform: `scaleX(${progress})` }}
              aria-hidden
            />
          )}
          <span className="relative flex items-center gap-1.5">
            {playing ? <PauseIcon /> : <SpeakerIcon />}
            {active ? `${index} / ${total}` : (label ?? "播放")}
          </span>
        </button>

        {/* 停止只在播放中出現：沒在播時它沒有意義，常駐只會多一顆死鍵 */}
        {active && (
          <button
            type="button"
            onClick={stop}
            aria-label="停止"
            title="停止（再按播放從頭重聽）"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-soft/50 text-soft transition-colors hover:border-accent hover:text-accent"
          >
            <StopIcon />
          </button>
        )}
      </span>
    );
  }

  return (
    <span className="say-slot relative">
      <button
        type="button"
        onClick={() => toggle(id, clipKeys)}
        disabled={!ready}
        aria-label={playing ? "暫停" : "播放"}
        title={ready ? undefined : "這一句的語音還沒產生"}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 text-[13px] transition-colors ${
          playing
            ? "border-accent bg-accent text-white"
            : "border-accent/70 text-accent hover:bg-accent hover:text-white"
        } disabled:cursor-not-allowed disabled:border-soft/30 disabled:text-soft/40 disabled:hover:bg-transparent`}
      >
        {active && <ProgressRing value={progress} />}
        {playing ? <PauseIcon /> : <SpeakerIcon />}
      </button>

      {/* 停止疊在按鈕右下角，用絕對定位所以不影響版面 */}
      {active && (
        <button
          type="button"
          onClick={stop}
          aria-label="停止"
          className="absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-paper bg-accent text-white shadow-sm"
        >
          <svg viewBox="0 0 24 24" width="9" height="9" aria-hidden>
            <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
          </svg>
        </button>
      )}
    </span>
  );
}

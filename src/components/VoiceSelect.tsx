"use client";

import { listVoices, setVoice, useSpeech } from "@/lib/speech";

export default function VoiceSelect() {
  const { available } = useSpeech();
  const voices = listVoices();
  if (!available || voices.length === 0) return null;
  const stored =
    typeof window !== "undefined" ? localStorage.getItem("ajar-voice") : null;

  return (
    <select
      aria-label="語音"
      defaultValue={stored ?? voices[0]?.name}
      onChange={(e) => setVoice(e.target.value)}
      className="max-w-[180px] rounded-md border border-soft/50 bg-paper px-2 py-1 text-xs text-ink"
    >
      {voices.map((v) => (
        <option key={v.name} value={v.name}>
          {v.name.replace(/Microsoft |English |\(United States\)/g, "")}
        </option>
      ))}
    </select>
  );
}

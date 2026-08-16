"use client";

import { useEffect, useState } from "react";

/**
 * 播放管理：優先播放預先產好的 MP3（Kokoro，生成當下已隨機配音），
 * 沒有音檔時退回瀏覽器語音合成，網站不會因為缺音檔而開天窗。
 * 支援開始 / 暫停 / 續播 / 切換，以及依序連播多句。
 */

type PlayState = { activeKey: string | null; paused: boolean };

let state: PlayState = { activeKey: null, paused: false };
const listeners = new Set<() => void>();

/** clip_key → 公開音檔 URL（由頁面注入） */
let clipUrls: Record<string, string> = {};

let audioEl: HTMLAudioElement | null = null;
let queue: string[] = [];
let queueIndex = 0;

function emit() {
  listeners.forEach((l) => l());
}

export function setClipUrls(map: Record<string, string>) {
  clipUrls = map;
}

// ── 瀏覽器語音（fallback） ──
let voices: SpeechSynthesisVoice[] = [];
let voiceOverride: string | null = null;

function scoreVoice(v: SpeechSynthesisVoice): number {
  return (
    (/natural|neural/i.test(v.name) ? 8 : 0) +
    (/google/i.test(v.name) ? 4 : 0) +
    (/online/i.test(v.name) ? 2 : 0) +
    (v.lang === "en-US" ? 1 : 0)
  );
}

function refreshVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  voices = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.startsWith("en"))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a));
  emit();
}

function currentVoice(): SpeechSynthesisVoice | null {
  const stored =
    voiceOverride ??
    (typeof window !== "undefined" ? localStorage.getItem("ajar-voice") : null);
  return voices.find((v) => v.name === stored) ?? voices[0] ?? null;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
  refreshVoices();
}

export function listVoices(): SpeechSynthesisVoice[] {
  return voices;
}

export function setVoice(name: string) {
  voiceOverride = name;
  localStorage.setItem("ajar-voice", name);
  emit();
}

// ── 播放核心 ──
function stopEverything() {
  window.speechSynthesis?.cancel();
  if (audioEl) {
    audioEl.pause();
    audioEl.onended = null;
    audioEl = null;
  }
  queue = [];
  queueIndex = 0;
}

function finish(key: string) {
  if (state.activeKey !== key) return;
  state = { activeKey: null, paused: false };
  emit();
}

/** 依序播放 queue 中第 queueIndex 個 clip */
function playNext(key: string) {
  if (queueIndex >= queue.length) return finish(key);
  const clipKey = queue[queueIndex];
  const url = clipUrls[clipKey];

  if (url) {
    audioEl = new Audio(url);
    audioEl.onended = () => {
      queueIndex += 1;
      playNext(key);
    };
    audioEl.onerror = () => {
      // 音檔壞掉/被刪：這一句退回瀏覽器語音
      audioEl = null;
      speakFallback(key, clipKey);
    };
    void audioEl.play().catch(() => {
      audioEl = null;
      speakFallback(key, clipKey);
    });
    return;
  }
  speakFallback(key, clipKey);
}

/** clip_key → 文字（無音檔時用），由頁面注入 */
let clipTexts: Record<string, string> = {};
export function setClipTexts(map: Record<string, string>) {
  clipTexts = map;
}

function speakFallback(key: string, clipKey: string) {
  const text = clipTexts[clipKey];
  if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) {
    queueIndex += 1;
    return playNext(key);
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.95;
  const v = currentVoice();
  if (v) u.voice = v;
  u.onend = () => {
    queueIndex += 1;
    playNext(key);
  };
  window.speechSynthesis.speak(u);
}

/** 同一 key 再按 = 暫停/續播；不同 key = 切過去 */
export function toggle(key: string, clipKeys: string[]) {
  if (state.activeKey === key) {
    if (state.paused) {
      if (audioEl) void audioEl.play();
      else window.speechSynthesis?.resume();
      state = { ...state, paused: false };
    } else {
      if (audioEl) audioEl.pause();
      else window.speechSynthesis?.pause();
      state = { ...state, paused: true };
    }
    emit();
    return;
  }

  stopEverything();
  queue = clipKeys;
  queueIndex = 0;
  state = { activeKey: key, paused: false };
  emit();
  playNext(key);
}

export function stopAll() {
  stopEverything();
  state = { activeKey: null, paused: false };
  emit();
}

/** available：有音檔就一定可播；否則看瀏覽器是否支援語音合成 */
export function useSpeech(): PlayState & { available: boolean } {
  const [mounted, setMounted] = useState(false);
  const [, force] = useState(0);
  useEffect(() => {
    setMounted(true);
    const l = () => force((n) => n + 1);
    listeners.add(l);
    refreshVoices();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return {
    ...state,
    available:
      mounted &&
      (Object.keys(clipUrls).length > 0 ||
        (typeof window !== "undefined" && "speechSynthesis" in window)),
  };
}

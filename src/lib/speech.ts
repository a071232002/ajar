"use client";

import { useEffect, useState } from "react";

/**
 * 播放管理：只播預先產好的 MP3（Kokoro，生成當下就決定好語音並烘進檔案）。
 *
 * 刻意「不」提供瀏覽器語音合成備援。備援聽起來完全取決於使用者的 OS 裝了什麼：
 * 這台機器的系統語音只有 Microsoft Hanhan(zh-TW) 與 Zira(en-US) 兩顆，
 * Chrome 唸日文時會抓中文語音去唸；Edge 自帶一整組線上語音所以正常。
 * 同一張卡在不同瀏覽器聽到不同結果，那不叫備援，叫不可預期。
 *
 * 所以沒有音檔時就明說沒有，不用別的聲音頂替。缺口由排程補齊。
 */

type PlayState = {
  activeKey: string | null;
  paused: boolean;
  /** 整個佇列的播放進度 0..1；沒在播是 0 */
  progress: number;
  /** 目前播到第幾句 / 共幾句 */
  index: number;
  total: number;
};

const IDLE: PlayState = {
  activeKey: null,
  paused: false,
  progress: 0,
  index: 0,
  total: 0,
};

let state: PlayState = IDLE;
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
  emit();
}

/** 進度更新很密集（timeupdate 每秒數次），四捨五入到 1% 才通知，避免無謂重繪 */
function setProgress(fraction: number) {
  const overall = queue.length
    ? (queueIndex + Math.min(1, Math.max(0, fraction))) / queue.length
    : 0;
  const rounded = Math.round(overall * 100) / 100;
  if (rounded === state.progress) return;
  state = { ...state, progress: rounded, index: queueIndex + 1, total: queue.length };
  emit();
}

function teardown() {
  if (audioEl) {
    audioEl.pause();
    audioEl.ontimeupdate = null;
    audioEl.onended = null;
    audioEl.onerror = null;
    audioEl = null;
  }
  queue = [];
  queueIndex = 0;
}

function finish(key: string) {
  if (state.activeKey !== key) return;
  teardown();
  state = IDLE;
  emit();
}

/** 依序播放 queue 中第 queueIndex 個 clip */
function playNext(key: string) {
  if (queueIndex >= queue.length) return finish(key);

  const url = clipUrls[queue[queueIndex]];
  if (!url) {
    queueIndex += 1;
    return playNext(key);
  }

  audioEl = new Audio(url);
  audioEl.ontimeupdate = () => {
    const d = audioEl?.duration;
    if (d && Number.isFinite(d)) setProgress((audioEl?.currentTime ?? 0) / d);
  };
  audioEl.onended = () => {
    queueIndex += 1;
    setProgress(0);
    playNext(key);
  };
  audioEl.onerror = () => {
    // 檔案壞掉或被刪：跳過，不要卡住整串
    queueIndex += 1;
    playNext(key);
  };
  void audioEl.play().catch(() => {
    queueIndex += 1;
    playNext(key);
  });
}

/** 這一組 clip 有沒有任何一句可播 */
export function playable(clipKeys: string[]): boolean {
  return clipKeys.some((k) => Boolean(clipUrls[k]));
}

/** 同一 key 再按 = 暫停／續播；不同 key = 切過去 */
export function toggle(key: string, clipKeys: string[]) {
  if (state.activeKey === key) {
    if (state.paused) {
      void audioEl?.play();
      state = { ...state, paused: false };
    } else {
      audioEl?.pause();
      state = { ...state, paused: true };
    }
    emit();
    return;
  }

  teardown();
  const keys = clipKeys.filter((k) => clipUrls[k]);
  if (keys.length === 0) return;

  queue = keys;
  queueIndex = 0;
  state = { activeKey: key, paused: false, progress: 0, index: 1, total: keys.length };
  emit();
  playNext(key);
}

/** 停止並歸零；再按播放就是從頭重聽 */
export function stop() {
  teardown();
  state = IDLE;
  emit();
}

export const stopAll = stop;

export function useSpeech(): PlayState {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    // 掛載後強制重繪一次：AudioProvider 的 effect 在樹上比較前面，
    // 它灌完 clipUrls 廣播時這裡還沒訂閱，不補這一次就永遠停在「沒有音檔」。
    l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

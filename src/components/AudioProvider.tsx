"use client";

import { useEffect } from "react";
import { setClipUrls, stopAll } from "@/lib/speech";

/** 把這張卡的音檔 URL 注入播放器；換頁時停掉正在播的內容 */
export default function AudioProvider({ urls }: { urls: Record<string, string> }) {
  useEffect(() => {
    setClipUrls(urls);
    return () => {
      stopAll();
      setClipUrls({});
    };
  }, [urls]);

  return null;
}

"use client";

import { useEffect } from "react";
import { setClipTexts, setClipUrls, stopAll } from "@/lib/speech";

/** 把這張卡的音檔 URL 與句子文字注入播放器；換頁時停掉正在播的內容 */
export default function AudioProvider({
  urls,
  texts,
}: {
  urls: Record<string, string>;
  texts: Record<string, string>;
}) {
  useEffect(() => {
    setClipUrls(urls);
    setClipTexts(texts);
    return () => {
      stopAll();
      setClipUrls({});
      setClipTexts({});
    };
  }, [urls, texts]);

  return null;
}

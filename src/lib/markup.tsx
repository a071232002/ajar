import type { ReactNode } from "react";

/**
 * 句型標記：英文句子裡用 **...** 圈出「值得記住的那一塊」。
 *
 * 選用行內標記而非另開 highlights 陣列，理由是生成端最不容易出錯——
 * 陣列要靠子字串比對回頭定位，句中重複出現時會標到錯的位置。
 *
 * 渲染時轉成 <mark>；送去合成語音前必須先用 stripMarks 剝掉，
 * 否則 TTS 會把星號唸出來。
 */
const MARK = /\*\*(.+?)\*\*/g;

export function renderMarked(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MARK.lastIndex = 0;
  while ((m = MARK.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<mark key={`${m.index}`}>{m[1]}</mark>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length > 0 ? out : [text];
}

/** 去掉標記符號，供語音合成與純文字用途 */
export function stripMarks(text: string): string {
  return text.replace(MARK, "$1");
}

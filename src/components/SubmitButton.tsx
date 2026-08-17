"use client";

import { useFormStatus } from "react-dom";

/**
 * 全站唯一的送出鈕。
 *
 * 存在的理由：server action 的表單送出沒有任何瀏覽器層級的回饋——不轉圈、不變色，
 * 成功後畫面又長一樣，按下去跟沒按分不出來。先前是各個表單各自處理，結果就是
 * 有的有、有的沒有。新增任何會打伺服器的表單，一律用這個。
 *
 * useFormStatus 讀的是最近一個外層 form 的狀態，所以必須放在 form 裡面。
 */
export default function SubmitButton({
  children,
  pendingLabel = "處理中…",
  variant = "solid",
  size = "md",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  /** solid 主要動作／outline 次要動作／link 破壞性或不顯眼的動作 */
  variant?: "solid" | "outline" | "link";
  size?: "sm" | "md";
}) {
  const { pending } = useFormStatus();

  const box = "inline-flex items-center gap-1.5 transition-opacity disabled:opacity-60";
  const pad = size === "sm" ? "px-3 py-1 text-[13px]" : "px-6 py-2";
  const skin = {
    solid: `rounded-md bg-accent font-medium text-white ${pad}`,
    outline: `rounded-md border-2 border-accent font-medium text-accent ${
      size === "sm" ? "px-3 py-0.5 text-[13px]" : "px-5 py-1.5"
    }`,
    link: "text-[12.5px] text-soft hover:text-accent",
  }[variant];

  return (
    <button type="submit" disabled={pending} className={`${box} ${skin}`}>
      {pending && <span className="nav-spinner" aria-hidden />}
      {pending ? pendingLabel : children}
    </button>
  );
}

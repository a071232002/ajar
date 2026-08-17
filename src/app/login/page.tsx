"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("登入失敗：帳號或密碼不正確。");
      setPending(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="sheet w-full max-w-[380px] px-8 py-10">
        <h1 className="font-hand text-center text-4xl font-semibold text-accent">
          ajar
        </h1>
        <p className="mb-8 mt-1 text-center font-mono text-xs text-soft">
          Keep your languages ajar.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="text-sm text-accent">
              {error}
            </p>
          )}
          <label className="flex flex-col gap-1 text-xs text-soft">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-soft/50 bg-paper px-3 py-2.5 text-base text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-soft">
            密碼
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-soft/50 bg-paper px-3 py-2.5 text-base text-ink"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-md bg-accent px-4 py-2.5 font-bold text-white shadow-[3px_3px_0_var(--shadow)] transition-transform active:translate-y-0.5 disabled:opacity-60"
          >
            {pending ? "進入中…" : "進入"}
          </button>
        </form>
      </div>
    </main>
  );
}

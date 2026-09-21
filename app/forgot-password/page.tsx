"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = (await response.json()) as { success?: boolean; message?: string; error?: string };

      if (!response.ok || !data.success) {
        setError(data.error || "요청을 처리할 수 없습니다.");
        return;
      }

      setMessage(data.message || "비밀번호 재설정 이메일을 발송했습니다.");
      setIsSent(true);
      setEmail("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white md:px-6 md:py-20">
      <div className="mx-auto max-w-md">
        <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-block text-2xl font-black tracking-tight">
              FLAT<span className="text-violet-400">LIVE</span>
            </Link>
            <p className="mt-2 text-sm text-zinc-400">비밀번호를 재설정하세요</p>
          </div>

          {isSent ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-green-950/30 border border-green-900/50 p-4">
                <p className="text-sm text-green-300">{message}</p>
                <p className="mt-2 text-xs text-green-400">
                  받은 편지함을 확인하고 재설정 링크를 클릭해주세요.
                </p>
              </div>

              <Link
                href="/login"
                className="block w-full rounded-2xl bg-violet-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-violet-500"
              >
                로그인으로 돌아가기
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-300">
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              {error ? (
                <p className="text-sm font-medium text-rose-400">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "발송 중..." : "재설정 이메일 발송"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-zinc-400">
            <Link href="/login" className="font-bold text-violet-400 transition hover:text-violet-300">
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

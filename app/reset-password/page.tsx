"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!userId || !token) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-rose-950/30 border border-rose-900/50 p-4">
          <p className="text-sm text-rose-300">잘못된 재설정 링크입니다.</p>
        </div>

        <Link
          href="/forgot-password"
          className="block w-full rounded-2xl bg-violet-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-violet-500"
        >
          처음부터 시작하기
        </Link>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("비밀번호를 입력해주세요.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          token,
          password,
          confirmPassword,
        }),
      });

      const data = (await response.json()) as { success?: boolean; message?: string; error?: string };

      if (!response.ok || !data.success) {
        setError(data.error || "비밀번호 재설정에 실패했습니다.");
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isSuccess ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-green-950/30 border border-green-900/50 p-4">
            <p className="text-sm text-green-300">비밀번호가 변경되었습니다.</p>
            <p className="mt-2 text-xs text-green-400">로그인 페이지로 이동합니다...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-300">
              새 비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="새 비밀번호를 입력하세요"
              className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-zinc-300">
              비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
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
            {isSubmitting ? "처리 중..." : "비밀번호 변경"}
          </button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white md:px-6 md:py-20">
      <div className="mx-auto max-w-md">
        <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-block text-2xl font-black tracking-tight">
              FLAT<span className="text-violet-400">LIVE</span>
            </Link>
            <p className="mt-2 text-sm text-zinc-400">새로운 비밀번호를 설정하세요</p>
          </div>

          <Suspense fallback={<div className="text-center text-sm text-zinc-400">로드 중...</div>}>
            <ResetPasswordForm />
          </Suspense>

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

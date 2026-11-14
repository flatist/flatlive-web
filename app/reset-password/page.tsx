"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import {
  authButtonClass,
  authButtonLinkClass,
  authCardClass,
  authErrorClass,
  authEyebrowClass,
  authGlowClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authMainClass,
  authSubtitleClass,
  authSuccessClass,
  authWordmarkClass,
} from "@/lib/auth-ui";

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
        <p role="alert" className={authErrorClass}>
          잘못된 재설정 링크입니다.
        </p>

        <Link href="/forgot-password" className={authButtonLinkClass}>
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
        <div role="status" className={authSuccessClass}>
          <p className="text-sm font-bold text-flat-yellow">비밀번호가 변경되었습니다.</p>
          <p className="mt-2 text-xs leading-5 text-zinc-400">로그인 페이지로 이동합니다...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className={authLabelClass}>
              새 비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="새 비밀번호를 입력하세요"
              className={authInputClass}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className={authLabelClass}>
              비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
              className={authInputClass}
            />
          </div>

          {error ? (
            <p role="alert" className={authErrorClass}>
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting} className={authButtonClass}>
            {isSubmitting ? "처리 중..." : "비밀번호 변경"}
          </button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className={authMainClass}>
      <div aria-hidden className={authGlowClass} />

      <div className="relative mx-auto max-w-md">
        <div className={authCardClass}>
          <div className="mb-8 text-center">
            <p className={authEyebrowClass}>NEW PASSWORD</p>

            <Link href="/" className={authWordmarkClass}>
              FLAT<span className="text-flat-yellow">LIVE</span>
            </Link>

            <p className={authSubtitleClass}>새로운 비밀번호를 설정하세요</p>
          </div>

          <Suspense fallback={<div className="text-center text-sm text-zinc-400">로드 중...</div>}>
            <ResetPasswordForm />
          </Suspense>

          <div className="mt-6 text-center text-sm text-zinc-400">
            <Link href="/login" className={authLinkClass}>
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

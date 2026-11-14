"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

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
    <main className={authMainClass}>
      <div aria-hidden className={authGlowClass} />

      <div className="relative mx-auto max-w-md">
        <div className={authCardClass}>
          <div className="mb-8 text-center">
            <p className={authEyebrowClass}>RESET PASSWORD</p>

            <Link href="/" className={authWordmarkClass}>
              FLAT<span className="text-flat-yellow">LIVE</span>
            </Link>

            <p className={authSubtitleClass}>비밀번호를 재설정하세요</p>
          </div>

          {isSent ? (
            <div className="space-y-4">
              <div role="status" className={authSuccessClass}>
                <p className="text-sm font-bold text-flat-yellow">{message}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-400">
                  받은 편지함을 확인하고 재설정 링크를 클릭해주세요.
                </p>
              </div>

              <Link href="/login" className={authButtonLinkClass}>
                로그인으로 돌아가기
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className={authLabelClass}>
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className={authInputClass}
                />
              </div>

              {error ? (
                <p role="alert" className={authErrorClass}>
                  {error}
                </p>
              ) : null}

              <button type="submit" disabled={isSubmitting} className={authButtonClass}>
                {isSubmitting ? "발송 중..." : "재설정 이메일 발송"}
              </button>
            </form>
          )}

          {/* 발송 완료 화면에는 같은 문구의 CTA 버튼이 이미 있으므로 중복 노출하지 않는다. */}
          {isSent ? null : (
            <div className="mt-6 text-center text-sm text-zinc-400">
              <Link href="/login" className={authLinkClass}>
                로그인으로 돌아가기
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

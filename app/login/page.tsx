"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import {
  authButtonClass,
  authCardClass,
  authErrorClass,
  authEyebrowClass,
  authGlowClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authMainClass,
  authMutedLinkClass,
  authSubtitleClass,
  authWordmarkClass,
} from "@/lib/auth-ui";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await login(username, password);

      if (!success) {
        setError("로그인에 실패했습니다. 입력 값을 확인해주세요.");
        return;
      }

      router.push("/");
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
            <p className={authEyebrowClass}>SIGN IN</p>

            <Link href="/" className={authWordmarkClass}>
              FLAT<span className="text-flat-yellow">LIVE</span>
            </Link>

            <p className={authSubtitleClass}>로그인하고 라이브를 시작해보세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className={authLabelClass}>
                아이디
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="username"
                className={authInputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className={authLabelClass}>
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호를 입력하세요"
                className={authInputClass}
              />
              <Link href="/forgot-password" className={`mt-2 inline-block ${authMutedLinkClass}`}>
                비밀번호를 잊으셨나요?
              </Link>
            </div>

            {error ? (
              <p role="alert" className={authErrorClass}>
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={isSubmitting} className={authButtonClass}>
              {isSubmitting ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-400">
            아직 계정이 없으신가요?{" "}
            <Link href="/signup" className={authLinkClass}>
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

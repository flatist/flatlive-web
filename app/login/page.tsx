"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useAuth } from "@/lib/auth-context";

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
    <main className="min-h-screen bg-black px-4 py-10 text-white md:px-6 md:py-20">
      <div className="mx-auto max-w-md">
        <div className="rounded-[28px] border border-white/10 bg-zinc-950/90 p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-block text-2xl font-black tracking-tight">
              FLAT<span className="text-violet-400">LIVE</span>
            </Link>
            <p className="mt-2 text-sm text-zinc-400">로그인하고 라이브를 시작해보세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-medium text-zinc-300">
                아이디
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="username"
                className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-300">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
              />
              <Link
                href="/forgot-password"
                className="mt-2 inline-block text-xs text-zinc-500 transition hover:text-violet-400"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </div>

            {error ? (
              <p className="text-sm font-medium text-rose-400">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-400">
            아직 계정이 없으신가요? {" "}
            <Link href="/signup" className="font-bold text-violet-400 transition hover:text-violet-300">
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useAuth } from "@/lib/auth-context";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [operationPolicyAccepted, setOperationPolicyAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!username.trim() || !email.trim() || !displayName.trim() || !password || !confirmPassword) {
      setError("아이디, 이메일, 닉네임, 비밀번호, 비밀번호 확인을 모두 입력해주세요.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (
      !termsAccepted ||
      !privacyAccepted ||
      !operationPolicyAccepted ||
      !ageConfirmed
    ) {
      setError("필수 약관 및 연령 확인에 모두 동의해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await signup(
        username,
        email,
        displayName,
        password,
        confirmPassword,
        birthDate,
        termsAccepted,
        privacyAccepted,
        operationPolicyAccepted,
        ageConfirmed,
        marketingAccepted,
      );

      if (!success) {
        setError("회원가입에 실패했습니다. 다시 시도해주세요.");
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
            <p className="mt-2 text-sm text-zinc-400">새 계정을 만들어 FLAT LIVE를 시작하세요</p>
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

            <div>
              <label htmlFor="displayName" className="mb-2 block text-sm font-medium text-zinc-300">
                닉네임
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="닉네임"
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

            <div>
              <label
                htmlFor="birthDate"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                생년월일
              </label>

              <input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(event) =>
                  setBirthDate(event.target.value)
                }
                required
                className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
              />

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                연령 확인 및 시청자 연령대 통계에 사용됩니다.
                크리에이터에게 생년월일 자체는 공개하지 않습니다.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
              <p className="mb-4 text-sm font-bold text-white">
                약관 동의
              </p>

              <label className="flex cursor-pointer items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) =>
                    setTermsAccepted(event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4"
                />

                <span className="text-sm text-zinc-300">
                  <strong className="text-violet-400">
                    [필수]
                  </strong>{" "}
                  FLAT LIVE 이용약관에 동의합니다.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(event) =>
                    setPrivacyAccepted(event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4"
                />

                <span className="text-sm text-zinc-300">
                  <strong className="text-violet-400">
                    [필수]
                  </strong>{" "}
                  개인정보 처리 및 수집·이용에 동의합니다.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={operationPolicyAccepted}
                  onChange={(event) =>
                    setOperationPolicyAccepted(
                      event.target.checked,
                    )
                  }
                  className="mt-0.5 h-4 w-4"
                />

                <span className="text-sm text-zinc-300">
                  <strong className="text-violet-400">
                    [필수]
                  </strong>{" "}
                  FLAT LIVE 운영정책을 확인하고 동의합니다.
                </span>
              </label>

              <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 pt-3 text-xs">
                <Link
                  href="/policy/terms"
                  target="_blank"
                  className="font-bold text-violet-400 hover:text-violet-300"
                >
                  이용약관 보기
                </Link>

                <Link
                  href="/policy/privacy"
                  target="_blank"
                  className="font-bold text-violet-400 hover:text-violet-300"
                >
                  개인정보처리방침 보기
                </Link>

                <Link
                  href="/policy/operation"
                  target="_blank"
                  className="font-bold text-violet-400 hover:text-violet-300"
                >
                  운영정책 보기
                </Link>
              </div>

              <label className="flex cursor-pointer items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(event) =>
                    setAgeConfirmed(
                      event.target.checked,
                    )
                  }
                  className="mt-0.5 h-4 w-4"
                />

                <span className="text-sm text-zinc-300">
                  <strong className="text-violet-400">
                    [필수]
                  </strong>{" "}
                  본인은 만 18세 이상임을 확인합니다.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={marketingAccepted}
                  onChange={(event) =>
                    setMarketingAccepted(event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4"
                />

                <span className="text-sm text-zinc-300">
                  <strong className="text-zinc-500">
                    [선택]
                  </strong>{" "}
                  이벤트 및 마케팅 정보 수신에 동의합니다.
                </span>
              </label>
            </div>

            {error ? (
              <p className="text-sm font-medium text-rose-400">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "가입 중..." : "회원가입"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-400">
            이미 계정이 있으신가요? {" "}
            <Link href="/login" className="font-bold text-violet-400 transition hover:text-violet-300">
              로그인
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

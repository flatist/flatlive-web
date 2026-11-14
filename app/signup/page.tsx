"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import {
  authButtonClass,
  authCardClass,
  authCheckboxClass,
  authErrorClass,
  authEyebrowClass,
  authGlowClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authMainClass,
  authSubtitleClass,
  authWordmarkClass,
} from "@/lib/auth-ui";

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
    <main className={authMainClass}>
      <div aria-hidden className={authGlowClass} />

      <div className="relative mx-auto max-w-md">
        <div className={authCardClass}>
          <div className="mb-8 text-center">
            <p className={authEyebrowClass}>JOIN FLATLIVE</p>

            <Link href="/" className={authWordmarkClass}>
              FLAT<span className="text-flat-yellow">LIVE</span>
            </Link>

            <p className={authSubtitleClass}>새 계정을 만들어 FLAT LIVE를 시작하세요</p>
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

            <div>
              <label htmlFor="displayName" className={authLabelClass}>
                닉네임
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="닉네임"
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

            <div>
              <label htmlFor="birthDate" className={authLabelClass}>
                생년월일
              </label>

              <input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                required
                className={`${authInputClass} [color-scheme:dark]`}
              />

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                연령 확인 및 시청자 연령대 통계에 사용됩니다.
                크리에이터에게 생년월일 자체는 공개하지 않습니다.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-flat-surface-2 p-4">
              <div className="mb-4 flex items-center gap-2">
                <span aria-hidden className="h-3 w-1 rounded-full bg-flat-yellow" />
                <p className="text-sm font-black text-white">약관 동의</p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  className={authCheckboxClass}
                />

                <span className="text-sm text-zinc-300">
                  <strong className="font-black text-flat-yellow">[필수]</strong>{" "}
                  FLAT LIVE 이용약관에 동의합니다.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(event) => setPrivacyAccepted(event.target.checked)}
                  className={authCheckboxClass}
                />

                <span className="text-sm text-zinc-300">
                  <strong className="font-black text-flat-yellow">[필수]</strong>{" "}
                  개인정보 처리 및 수집·이용에 동의합니다.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={operationPolicyAccepted}
                  onChange={(event) => setOperationPolicyAccepted(event.target.checked)}
                  className={authCheckboxClass}
                />

                <span className="text-sm text-zinc-300">
                  <strong className="font-black text-flat-yellow">[필수]</strong>{" "}
                  FLAT LIVE 운영정책을 확인하고 동의합니다.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(event) => setAgeConfirmed(event.target.checked)}
                  className={authCheckboxClass}
                />

                <span className="text-sm text-zinc-300">
                  <strong className="font-black text-flat-yellow">[필수]</strong>{" "}
                  본인은 만 18세 이상임을 확인합니다.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={marketingAccepted}
                  onChange={(event) => setMarketingAccepted(event.target.checked)}
                  className={authCheckboxClass}
                />

                <span className="text-sm text-zinc-300">
                  <strong className="font-black text-zinc-500">[선택]</strong>{" "}
                  이벤트 및 마케팅 정보 수신에 동의합니다.
                </span>
              </label>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.08] pt-3 text-xs">
                <Link href="/policy/terms" target="_blank" className={authLinkClass}>
                  이용약관 보기
                </Link>

                <Link href="/policy/privacy" target="_blank" className={authLinkClass}>
                  개인정보처리방침 보기
                </Link>

                <Link href="/policy/operation" target="_blank" className={authLinkClass}>
                  운영정책 보기
                </Link>
              </div>
            </div>

            {error ? (
              <p role="alert" className={authErrorClass}>
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={isSubmitting} className={authButtonClass}>
              {isSubmitting ? "가입 중..." : "회원가입"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-400">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className={authLinkClass}>
              로그인
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

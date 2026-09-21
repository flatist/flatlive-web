"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function WithdrawAccountClient({
  username,
}: {
  username: string;
}) {
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) return;

    setError("");

    if (!password) {
      setError("현재 비밀번호를 입력해주세요.");
      return;
    }

    if (!agreed) {
      setError("탈퇴 안내사항에 동의해주세요.");
      return;
    }

    const confirmed = window.confirm(
      "정말 회원탈퇴하시겠습니까?\n\n탈퇴 후에는 현재 계정으로 다시 로그인할 수 없습니다.",
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/withdraw",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
            confirmed: true,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.error ||
            "회원탈퇴 처리에 실패했습니다.",
        );
        return;
      }

      window.alert(
        "회원탈퇴가 완료되었습니다.",
      );

      window.location.href = "/login";
    } catch (error) {
      console.error(
        "[WITHDRAW_UI_ERROR]",
        error,
      );

      setError(
        "회원탈퇴 처리 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/profile"
          className="mb-6 inline-block text-sm font-bold text-zinc-400 hover:text-white"
        >
          ← 마이페이지
        </Link>

        <h1 className="text-2xl font-black">
          회원탈퇴
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          @{username}
        </p>

        <div className="mt-6 rounded-3xl border border-red-500/20 bg-zinc-950 p-5 md:p-7">
          <div className="rounded-2xl bg-red-500/[0.07] p-4">
            <div className="font-black text-red-400">
              탈퇴 전 확인해주세요
            </div>

            <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-400">
              <p>
                • 탈퇴 즉시 로그인이 차단됩니다.
              </p>

              <p>
                • 현재 로그인 상태도 종료됩니다.
              </p>

              <p>
                • 계정은 즉시 물리 삭제하지 않고
                탈퇴 상태로 처리됩니다.
              </p>

              <p>
                • 정산 및 법적 보관이 필요한
                기록은 정책에 따라 보관될 수 있습니다.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6"
          >
            <label className="block text-sm font-bold">
              현재 비밀번호
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder="비밀번호 입력"
              autoComplete="current-password"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-white outline-none focus:border-white/30"
            />

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black p-4">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) =>
                  setAgreed(
                    event.target.checked,
                  )
                }
                className="mt-1"
              />

              <span className="text-sm leading-6 text-zinc-400">
                위 내용을 확인했으며 회원탈퇴에
                동의합니다.
              </span>
            </label>

            {error && (
              <div className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !password ||
                !agreed
              }
              className="mt-6 w-full rounded-2xl bg-red-600 py-4 font-black text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading
                ? "탈퇴 처리 중..."
                : "회원탈퇴"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

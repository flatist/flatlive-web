"use client";

import Link from "next/link";
import {
  FormEvent,
  useState,
} from "react";

type Result = {
  symptom: string;
  generatedAt: string;
  category: string;
  label: string;
  summary: string;
  checks: string[];
  links: {
    label: string;
    href: string;
  }[];
};

type Trace = {
  donationId: string;
  amount: number | null;
  status: string;
  requiresManualReview: boolean;
  senderUserId: string | null;
  receiverUserId: string | null;
};

export default function SystemDiagnosticsPage() {
  const [symptom, setSymptom] =
    useState("");

  const [result, setResult] =
    useState<Result | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [donationId, setDonationId] =
    useState("");

  const [trace, setTrace] =
    useState<Trace | null>(null);

  const [reason, setReason] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/admin/system-diagnostics",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            symptom,
          }),
        },
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "진단 실패",
        );
      }

      setResult(data.result);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "진단 실패",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadTrace() {
    if (!donationId.trim()) return;

    setBusy(true);
    setMessage("");
    setTrace(null);

    try {
      const response = await fetch(
        `/api/admin/donations/trace?donationId=${encodeURIComponent(
          donationId.trim(),
        )}`,
        {
          cache: "no-store",
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Trace 조회 실패",
        );
      }

      setTrace(data);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Trace 조회 실패",
      );
    } finally {
      setBusy(false);
    }
  }

  async function recoverDonation() {
    if (!trace) return;

    if (
      !trace.requiresManualReview ||
      trace.status !==
        "FAILED_REQUIRES_REVIEW"
    ) {
      setMessage(
        "이 거래는 수동복구 대상이 아닙니다.",
      );
      return;
    }

    if (!reason.trim()) {
      setMessage(
        "복구 사유를 입력해 주세요.",
      );
      return;
    }

    if (
      !window.confirm(
        "실제 FLAT 복구 거래를 생성합니다. 계속할까요?",
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        "/api/admin/donations/manual-recovery",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            donationId:
              donationId.trim(),
            reason:
              reason.trim(),
          }),
        },
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "복구 실패",
        );
      }

      setMessage(
        "수동복구가 완료되었습니다.",
      );

      setReason("");

      await loadTrace();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "복구 실패",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black tracking-[0.18em] text-zinc-400">
            SYSTEM DIAGNOSTICS & RECOVERY
          </div>

          <h1 className="mt-1 text-2xl font-black">
            시스템 진단 · 복구 센터
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            증상을 입력하면 관련 시스템 영역을 찾고,
            안전성이 확인된 복구 기능은 바로 실행합니다.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/member-diagnostics"
            className="rounded-xl border px-4 py-2 text-sm font-bold"
          >
            회원 오류조회
          </Link>

          <Link
            href="/admin/audit"
            className="rounded-xl border px-4 py-2 text-sm font-bold"
          >
            감사 로그
          </Link>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="mt-6"
      >
        <textarea
          value={symptom}
          onChange={(event) =>
            setSymptom(
              event.target.value,
            )
          }
          rows={4}
          placeholder="예: 후원했는데 FLAT만 빠지고 방송자 수익이 안 들어왔어"
          className="w-full rounded-2xl border border-zinc-300 p-4 text-sm"
        />

        <button
          disabled={
            loading ||
            !symptom.trim()
          }
          className="mt-3 rounded-xl bg-zinc-950 px-6 py-3 text-sm font-black text-white disabled:opacity-40"
        >
          {loading
            ? "진단 중..."
            : "오류 진단"}
        </button>
      </form>

      {message && (
        <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm font-bold text-blue-800">
          {message}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-5">
          <section className="rounded-2xl bg-zinc-50 p-5">
            <div className="text-xs font-black text-zinc-500">
              진단 영역
            </div>

            <div className="mt-1 text-xl font-black">
              {result.label}
            </div>

            <div className="mt-2 text-sm text-zinc-600">
              {result.summary}
            </div>
          </section>

          <section className="rounded-2xl border p-5">
            <h2 className="font-black">
              점검 항목
            </h2>

            <div className="mt-3 space-y-2">
              {result.checks.map(
                (item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="rounded-xl bg-zinc-50 p-3 text-sm"
                  >
                    {index + 1}. {item}
                  </div>
                ),
              )}
            </div>
          </section>

          <section className="rounded-2xl border p-5">
            <h2 className="font-black">
              조치 화면
            </h2>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {result.links.map(
                (link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-xl border p-4 font-bold"
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          </section>

          {result.category ===
            "DONATION" && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-black">
                후원 Trace · 직접 복구
              </h2>

              <div className="mt-3 flex gap-2">
                <input
                  value={donationId}
                  onChange={(event) => {
                    setDonationId(
                      event.target.value,
                    );
                    setTrace(null);
                  }}
                  placeholder="후원 ID"
                  className="min-w-0 flex-1 rounded-xl border bg-white px-4 py-3 text-sm"
                />

                <button
                  type="button"
                  onClick={() =>
                    void loadTrace()
                  }
                  disabled={busy}
                  className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white"
                >
                  Trace 확인
                </button>
              </div>

              {trace && (
                <div className="mt-4 rounded-xl bg-white p-4 text-sm">
                  <div>
                    상태:{" "}
                    <b>{trace.status}</b>
                  </div>

                  <div className="mt-1">
                    금액:{" "}
                    <b>
                      {typeof trace.amount ===
                      "number"
                        ? `${trace.amount.toLocaleString()} FLAT`
                        : "-"}
                    </b>
                  </div>

                  {trace.requiresManualReview &&
                    trace.status ===
                      "FAILED_REQUIRES_REVIEW" && (
                      <div className="mt-4">
                        <textarea
                          value={reason}
                          onChange={(event) =>
                            setReason(
                              event.target
                                .value,
                            )
                          }
                          rows={3}
                          placeholder="복구 사유"
                          className="w-full rounded-xl border p-3"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            void recoverDonation()
                          }
                          disabled={busy}
                          className="mt-2 rounded-xl bg-red-600 px-5 py-3 font-black text-white"
                        >
                          수동복구 실행
                        </button>
                      </div>
                    )}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </main>
  );
}

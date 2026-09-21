"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

type SettlementRecord = {
  settlementId: string;
  creatorAmount: number;
  status:
    | "CALCULATED"
    | "PENDING"
    | "APPROVED"
    | "PAID"
    | "HOLD"
    | "CANCELLED";
  createdAt: string;
};

type SettlementSummary = {
  success: true;

  affiliation:
    | "AGENCY"
    | "INDEPENDENT";

  creatorRate: number;

  liveGross: number;
  contentGross: number;
  totalGross: number;

  creatorTotal: number;
  reservedCreatorAmount: number;
  availableCreatorAmount: number;

  availableKrw: number;

  flatToKrw: number;
  minSettlementFlat: number;
  minSettlementKrw: number;

  records: SettlementRecord[];
};

function money(
  value: number,
) {
  return value.toLocaleString(
    "ko-KR",
  );
}

function statusLabel(
  status:
    SettlementRecord["status"],
) {
  switch (status) {
    case "PENDING":
      return "신청대기";

    case "APPROVED":
      return "승인";

    case "PAID":
      return "지급완료";

    case "HOLD":
      return "보류";

    case "CANCELLED":
      return "취소";

    default:
      return "계산완료";
  }
}

export default function SettlementPage() {
  const [
    summary,
    setSummary,
  ] =
    useState<SettlementSummary | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const load =
    useCallback(
      async () => {
        setLoading(true);

        try {
          const response =
            await fetch(
              "/api/profile/settlement",
              {
                cache:
                  "no-store",
              },
            );

          if (
            response.status ===
            401
          ) {
            window.location.href =
              "/login";
            return;
          }

          const data =
            await response.json();

          if (
            !response.ok ||
            !data.success
          ) {
            setMessage(
              data.error ??
                "정산 정보를 불러오지 못했습니다.",
            );
            return;
          }

          setSummary(
            data,
          );
        } catch {
          setMessage(
            "정산 정보를 불러오지 못했습니다.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(() => {
    void load();
  }, [load]);

  async function requestSettlement() {
    if (
      !summary ||
      submitting
    ) {
      return;
    }

    setSubmitting(
      true,
    );

    setMessage("");

    try {
      const response =
        await fetch(
          "/api/profile/settlement",
          {
            method:
              "POST",
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        setMessage(
          data.error ??
            "정산 신청에 실패했습니다.",
        );

        return;
      }

      setMessage(
        "정산 신청이 완료되었습니다.",
      );

      await load();
    } catch {
      setMessage(
        "정산 신청 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }

  if (
    loading &&
    !summary
  ) {
    return (
      <main className="min-h-screen bg-black px-4 py-24 text-white">
        <div className="mx-auto max-w-4xl text-sm text-zinc-500">
          정산 정보를 불러오는 중...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-widest text-flat-yellow">
              SETTLEMENT
            </p>

            <h1 className="mt-2 text-3xl font-black">
              정산
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              LIVE 후원과 영상 후원
              수익을 합산하여
              정산합니다.
            </p>
          </div>

          <Link
            href="/profile/revenue"
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold"
          >
            받은 수익
          </Link>
        </div>

        {summary && (
          <>
            <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-5">
                <div className="text-xs text-zinc-500">
                  LIVE 후원 총액
                </div>

                <div className="mt-2 text-2xl font-black">
                  {money(
                    summary.liveGross,
                  )}{" "}
                  FLAT
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-5">
                <div className="text-xs text-zinc-500">
                  영상 후원 총액
                </div>

                <div className="mt-2 text-2xl font-black">
                  {money(
                    summary.contentGross,
                  )}{" "}
                  FLAT
                </div>
              </div>

              <div className="rounded-2xl border border-flat-yellow/30 bg-zinc-950 p-5">
                <div className="text-xs font-bold text-flat-yellow">
                  내 수익 {summary.creatorRate}%
                </div>

                <div className="mt-2 text-2xl font-black">
                  {money(
                    summary.creatorTotal,
                  )}{" "}
                  FLAT
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-white/[0.08] bg-zinc-950 p-6">
              <div className="text-sm text-zinc-500">
                현재 정산 가능
              </div>

              <div className="mt-2 text-4xl font-black text-flat-yellow">
                {money(
                  summary.availableCreatorAmount,
                )}{" "}
                FLAT
              </div>

              <div className="mt-2 text-sm text-zinc-500">
                약{" "}
                {money(
                  summary.availableKrw,
                )}
                원
              </div>

              <div className="mt-5 rounded-2xl bg-black p-4 text-xs leading-6 text-zinc-500">
                1 FLAT =
                {" "}
                {money(
                  summary.flatToKrw,
                )}
                원
                <br />

                최소 정산:
                {" "}
                {money(
                  summary.minSettlementFlat,
                )}
                FLAT
                {" "}
                (
                {money(
                  summary.minSettlementKrw,
                )}
                원)
              </div>

              <button
                type="button"
                onClick={
                  requestSettlement
                }
                disabled={
                  submitting ||
                  summary.availableCreatorAmount <
                    summary.minSettlementFlat
                }
                className="mt-5 w-full rounded-2xl bg-flat-yellow px-5 py-4 font-black text-black disabled:cursor-not-allowed disabled:opacity-30"
              >
                {submitting
                  ? "신청 중..."
                  : "전체 정산 신청"}
              </button>

              {message && (
                <div className="mt-4 text-center text-sm text-zinc-400">
                  {message}
                </div>
              )}
            </section>

            <section className="mt-10">
              <h2 className="text-xl font-black">
                정산 내역
              </h2>

              <div className="mt-4 space-y-3">
                {summary.records.length ===
                0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-600">
                    아직 정산 신청
                    내역이 없습니다.
                  </div>
                ) : (
                  summary.records.map(
                    (record) => (
                      <div
                        key={
                          record.settlementId
                        }
                        className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-5"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="font-black">
                              {money(
                                record.creatorAmount,
                              )}{" "}
                              FLAT
                            </div>

                            <div className="mt-1 text-xs text-zinc-600">
                              {new Date(
                                record.createdAt,
                              ).toLocaleString(
                                "ko-KR",
                              )}
                            </div>
                          </div>

                          <div className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold">
                            {statusLabel(
                              record.status,
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

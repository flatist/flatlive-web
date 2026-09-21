"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const PRESET_AMOUNTS = [
  5000,
  10000,
  30000,
  50000,
  100000,
];

type PaymentMethod =
  | "card"
  | "easy"
  | "bank";

function formatAmount(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export default function ChargePage() {
  const [selectedAmount, setSelectedAmount] =
    useState(10000);

  const [customMode, setCustomMode] =
    useState(false);

  const [customAmount, setCustomAmount] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("card");

  const [prepareBusy, setPrepareBusy] =
    useState(false);

  const [prepareMessage, setPrepareMessage] =
    useState("");

  const [prepareTraceId, setPrepareTraceId] =
    useState("");

  const chargeAmount = useMemo(() => {
    if (!customMode) {
      return selectedAmount;
    }

    const parsed = Number(
      customAmount.replace(/[^0-9]/g, ""),
    );

    if (!Number.isSafeInteger(parsed)) {
      return 0;
    }

    return Math.max(0, parsed);
  }, [
    customMode,
    customAmount,
    selectedAmount,
  ]);

  const extraAmount =
    Math.floor(chargeAmount * 0.11);

  const totalPayment =
    chargeAmount + extraAmount;

  function selectPreset(value: number) {
    setSelectedAmount(value);
    setCustomMode(false);
    setCustomAmount("");
  }

  async function prepareCharge() {
    if (prepareBusy || chargeAmount < 1) {
      return;
    }

    setPrepareBusy(true);
    setPrepareMessage("");
    setPrepareTraceId("");

    try {
      const response = await fetch(
        "/api/charge/prepare",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chargeAmount,
            paymentMethod,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setPrepareMessage(
          data?.message ??
            "결제 준비에 실패했습니다.",
        );
        setPrepareTraceId(
          data?.traceId ?? "",
        );
        return;
      }

      setPrepareMessage(
        `결제 준비 완료 · 주문번호 ${data.orderId}`,
      );

      setPrepareTraceId(
        data.traceId ?? "",
      );
    } catch {
      setPrepareMessage(
        "결제 준비 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      setPrepareBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 pb-24 pt-8 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-zinc-500">
              FLAT CHARGE
            </p>

            <h1 className="mt-1 text-3xl font-black">
              FLAT 충전
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              웹 전용 충전 페이지
            </p>
          </div>

          <Link
            href="/wallet"
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold transition hover:bg-white hover:text-black"
          >
            지갑으로
          </Link>
        </header>

        <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-950 p-5 md:p-6">
          <h2 className="text-lg font-black">
            충전 금액
          </h2>

          <p className="mt-1 text-xs text-zinc-600">
            충전할 FLAT을 선택해주세요.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PRESET_AMOUNTS.map((value) => {
              const selected =
                !customMode &&
                selectedAmount === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    selectPreset(value)
                  }
                  className={
                    selected
                      ? "rounded-xl border border-white bg-white px-4 py-4 text-sm font-black text-black"
                      : "rounded-xl border border-white/10 bg-black px-4 py-4 text-sm font-black text-white transition hover:border-white/30"
                  }
                >
                  {formatAmount(value)} FLAT
                </button>
              );
            })}

            <button
              type="button"
              onClick={() =>
                setCustomMode(true)
              }
              className={
                customMode
                  ? "rounded-xl border border-white bg-white px-4 py-4 text-sm font-black text-black"
                  : "rounded-xl border border-white/10 bg-black px-4 py-4 text-sm font-black text-white transition hover:border-white/30"
              }
            >
              직접 입력
            </button>
          </div>

          {customMode ? (
            <div className="mt-4">
              <label className="text-xs font-bold text-zinc-500">
                직접 충전
              </label>

              <div className="mt-2 flex items-center rounded-xl border border-white/10 bg-black px-4">
                <input
                  inputMode="numeric"
                  value={customAmount}
                  onChange={(event) => {
                    setCustomAmount(
                      event.target.value.replace(
                        /[^0-9]/g,
                        "",
                      ),
                    );
                  }}
                  placeholder="금액 입력"
                  className="min-w-0 flex-1 bg-transparent py-4 text-right text-lg font-black text-white outline-none placeholder:text-zinc-700"
                />

                <span className="ml-2 text-sm font-bold text-zinc-500">
                  FLAT
                </span>
              </div>
            </div>
          ) : null}
        </section>

        <section className="mt-4 rounded-3xl border border-white/10 bg-zinc-950 p-5 md:p-6">
          <h2 className="text-lg font-black">
            결제금액
          </h2>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">
                FLAT
              </span>

              <strong>
                {formatAmount(chargeAmount)}원
              </strong>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">
                충전 수수료 11%
              </span>

              <strong>
                {formatAmount(extraAmount)}원
              </strong>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="flex items-end justify-between gap-4">
                <span className="text-sm font-bold text-zinc-400">
                  최종 결제금액
                </span>

                <strong className="text-2xl font-black">
                  {formatAmount(totalPayment)}원
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-white/10 bg-zinc-950 p-5 md:p-6">
          <h2 className="text-lg font-black">
            결제수단
          </h2>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                setPaymentMethod("card")
              }
              className={
                paymentMethod === "card"
                  ? "rounded-xl border border-white bg-white px-2 py-4 text-xs font-black text-black"
                  : "rounded-xl border border-white/10 bg-black px-2 py-4 text-xs font-bold text-white"
              }
            >
              신용카드
            </button>

            <button
              type="button"
              onClick={() =>
                setPaymentMethod("easy")
              }
              className={
                paymentMethod === "easy"
                  ? "rounded-xl border border-white bg-white px-2 py-4 text-xs font-black text-black"
                  : "rounded-xl border border-white/10 bg-black px-2 py-4 text-xs font-bold text-white"
              }
            >
              간편결제
            </button>

            <button
              type="button"
              onClick={() =>
                setPaymentMethod("bank")
              }
              className={
                paymentMethod === "bank"
                  ? "rounded-xl border border-white bg-white px-2 py-4 text-xs font-black text-black"
                  : "rounded-xl border border-white/10 bg-black px-2 py-4 text-xs font-bold text-white"
              }
            >
              계좌결제
            </button>
          </div>
        </section>

        <button
          type="button"
          onClick={prepareCharge}
          disabled={
            prepareBusy ||
            chargeAmount < 1000
          }
          className="mt-5 w-full rounded-2xl bg-white py-4 text-sm font-black text-black transition disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500"
        >
          {prepareBusy
            ? "결제 준비 중..."
            : `${formatAmount(totalPayment)}원 결제하기`}
        </button>

        {prepareMessage ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-300">
            <p>{prepareMessage}</p>

            {prepareTraceId ? (
              <p className="mt-2 break-all text-[10px] text-zinc-600">
                Trace ID: {prepareTraceId}
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="mt-4 text-center text-[11px] leading-5 text-zinc-700">
          현재는 웹 충전 화면 테스트 단계입니다.
          실제 PG 결제와 FLAT 지급은 아직 연결되지 않았습니다.
        </p>
      </div>
    </main>
  );
}

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  parseSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { createChargeOrder } from "@/lib/charge/local-charge-order-store";

type PaymentMethod =
  | "card"
  | "easy"
  | "bank";

const MIN_CHARGE_AMOUNT = 1000;
const MAX_CHARGE_AMOUNT = 1000000;

const CHARGE_FEE_RATE = 0.11;

function isPaymentMethod(
  value: unknown,
): value is PaymentMethod {
  return (
    value === "card" ||
    value === "easy" ||
    value === "bank"
  );
}

export async function POST(
  request: Request,
) {
  const traceId = randomUUID();

  try {
    const token = (await cookies()).get(
      SESSION_COOKIE_NAME,
    )?.value;

    const userId = token
      ? parseSessionToken(token)?.userId ?? null
      : null;

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "UNAUTHORIZED",
          message:
            "로그인 후 충전할 수 있습니다.",
          traceId,
        },
        { status: 401 },
      );
    }

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_JSON",
          message:
            "요청 형식을 확인해주세요.",
          traceId,
        },
        { status: 400 },
      );
    }

    const requestBody =
      body &&
      typeof body === "object" &&
      !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : null;

    const chargeAmount =
      requestBody?.chargeAmount;

    const paymentMethod =
      requestBody?.paymentMethod;

    if (
      typeof chargeAmount !== "number" ||
      !Number.isSafeInteger(chargeAmount) ||
      chargeAmount < MIN_CHARGE_AMOUNT ||
      chargeAmount > MAX_CHARGE_AMOUNT
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_CHARGE_AMOUNT",
          message:
            `충전 금액은 ${MIN_CHARGE_AMOUNT.toLocaleString()} ~ ${MAX_CHARGE_AMOUNT.toLocaleString()} FLAT 사이여야 합니다.`,
          traceId,
        },
        { status: 400 },
      );
    }

    if (
      !isPaymentMethod(paymentMethod)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_PAYMENT_METHOD",
          message:
            "결제수단을 확인해주세요.",
          traceId,
        },
        { status: 400 },
      );
    }

    /*
     * 중요:
     * 결제금액은 클라이언트에서 받은 값을
     * 믿지 않고 서버에서 다시 계산한다.
     */
    const feeAmount = Math.floor(
      chargeAmount * CHARGE_FEE_RATE,
    );

    const totalPaymentAmount =
      chargeAmount + feeAmount;

    const orderId =
      `flat-charge-${Date.now()}-${randomUUID()}`;

    const now =
      new Date().toISOString();

    await createChargeOrder({
      orderId,
      traceId,
      userId,

      assetType: "FLAT",
      chargeAmount,

      feeRate: CHARGE_FEE_RATE,
      feeAmount,
      totalPaymentAmount,

      paymentMethod,
      currency: "KRW",

      status: "PENDING",

      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      ok: true,

      orderId,
      traceId,

      charge: {
        assetType: "FLAT",
        chargeAmount,
        feeRate: CHARGE_FEE_RATE,
        feeAmount,
        totalPaymentAmount,
      },

      payment: {
        method: paymentMethod,
        currency: "KRW",
        status: "READY",
      },

      /*
       * 아직 PG 승인 전이므로
       * WalletService.createTransaction()을
       * 절대 호출하지 않는다.
       */
      walletCredited: false,
    });
  } catch (error) {
    console.error(
      "[CHARGE_PREPARE_FAILED]",
      {
        traceId,
        error,
      },
    );

    return NextResponse.json(
      {
        ok: false,
        error: "CHARGE_PREPARE_FAILED",
        message:
          "충전 준비 중 오류가 발생했습니다.",
        traceId,
      },
      { status: 500 },
    );
  }
}

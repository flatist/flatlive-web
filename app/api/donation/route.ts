import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  parseSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { DonationService } from "@/lib/donation/donation-service";
import { getDonationTrace } from "@/lib/donation/donation-trace";
import { appendDonationContentLink } from "@/lib/donation/donation-content-store";
import { getLiveRoom } from "@/lib/live/test-signaling-store";

export async function POST(request: Request) {
  const traceId = `DONATION-${Date.now()}-${randomUUID().slice(0, 8)}`;

  try {
    const token = (await cookies()).get(
      SESSION_COOKIE_NAME,
    )?.value;

    const senderUserId = token
      ? parseSessionToken(token)?.userId ?? null
      : null;

    if (!senderUserId) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "DONATION_AUTH_REQUIRED",
          error: "로그인이 필요합니다.",
          traceId,
        },
        { status: 401 },
      );
    }

    const body = await request.json();

    const roomId =
      typeof body.roomId === "string"
        ? body.roomId.trim()
        : "";

    const amount = Number(body.amount);

    const donationMode:
      | "single"
      | "repeat"
      | "sequence" =
      body.donationMode === "repeat" ||
      body.donationMode === "sequence"
        ? body.donationMode
        : "single";

    if (!roomId) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "DONATION_ROOM_REQUIRED",
          error: "방송 정보를 확인할 수 없습니다.",
          traceId,
        },
        { status: 400 },
      );
    }

    const room = getLiveRoom(roomId);

    if (!room || !room.broadcasterUserId) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "DONATION_ROOM_NOT_FOUND",
          error: "후원할 방송을 찾을 수 없습니다.",
          traceId,
        },
        { status: 404 },
      );
    }

    const receiverUserId =
      room.broadcasterUserId;

    if (
      !Number.isSafeInteger(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "DONATION_INVALID_AMOUNT",
          error: "후원 금액이 올바르지 않습니다.",
          traceId,
        },
        { status: 400 },
      );
    }

    const donationId =
      `donation_${Date.now()}_${randomUUID()}`;

    const result =
      await new DonationService().sendDonation({
        senderUserId,
        receiverUserId,
        amount,
        donationId,
        donationMode,
      });

    try {
      await appendDonationContentLink({
        donationId,
        contentType: "LIVE",
        contentId: roomId,
        contentTitle: room.title,
        category: room.category,
        senderUserId,
        receiverUserId,
        createdAt: new Date().toISOString(),
      });
    } catch (contentLinkError) {
      console.error(
        "DONATION_CONTENT_LINK_WRITE_FAILED",
        {
          donationId,
          roomId,
          traceId,
          error:
            contentLinkError instanceof Error
              ? contentLinkError.message
              : "UNKNOWN_ERROR",
        },
      );
    }

    const donationTrace =
      await getDonationTrace(donationId);

    return NextResponse.json({
      success: true,
      donationId,
      amount,
      donationMode,
      senderUserId,
      receiverUserId,
      transactionIds: {
        sender:
          result.sender.transactionId,
        receiver:
          result.receiver.transactionId,
      },
      eventTypes: donationTrace.map(
        (event) => event.eventType,
      ),
      traceId,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR";

    console.error("DONATION_POST_FAILED", {
      traceId,
      error,
    });

    let errorCode =
      "DONATION_FAILED";

    let status = 500;

    if (
      message ===
      "잔액이 부족합니다."
    ) {
      errorCode =
        "DONATION_INSUFFICIENT_BALANCE";
      status = 400;
    } else if (
      message ===
      "자기 자신에게 후원할 수 없습니다."
    ) {
      errorCode =
        "DONATION_SELF_NOT_ALLOWED";
      status = 400;
    } else if (
      message ===
      "후원 금액이 올바르지 않습니다."
    ) {
      errorCode =
        "DONATION_INVALID_AMOUNT";
      status = 400;
    }

    return NextResponse.json(
      {
        success: false,
        errorCode,
        error: message,
        traceId,
      },
      { status },
    );
  }
}

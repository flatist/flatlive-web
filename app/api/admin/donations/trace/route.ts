import { NextRequest, NextResponse } from "next/server";

import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";

import { getDonationTrace } from "@/lib/donation/donation-trace";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("DONATION_READ");

    const donationId =
      request.nextUrl.searchParams.get("donationId")?.trim() ?? "";

    if (!donationId) {
      return NextResponse.json(
        {
          error: "donationId가 필요합니다.",
        },
        { status: 400 },
      );
    }

    const trace = await getDonationTrace(donationId);

    if (trace.length === 0) {
      return NextResponse.json(
        {
          error: "해당 후원 기록을 찾을 수 없습니다.",
          donationId,
        },
        { status: 404 },
      );
    }

    const started = trace.find(
      (event) => event.eventType === "DONATION_STARTED",
    );

    const completed = trace.some(
      (event) => event.eventType === "COMPLETED",
    );

    const compensationCompleted = trace.some(
      (event) =>
        event.eventType === "COMPENSATION_COMPLETED",
    );

    const compensationFailed = trace.some(
      (event) =>
        event.eventType === "COMPENSATION_FAILED",
    );

    const failed = trace.some(
      (event) => event.eventType === "FAILED",
    );

    let status:
      | "COMPLETED"
      | "FAILED_COMPENSATED"
      | "FAILED_REQUIRES_REVIEW"
      | "FAILED"
      | "PROCESSING" = "PROCESSING";

    if (completed) {
      status = "COMPLETED";
    } else if (compensationFailed) {
      status = "FAILED_REQUIRES_REVIEW";
    } else if (failed && compensationCompleted) {
      status = "FAILED_COMPENSATED";
    } else if (failed) {
      status = "FAILED";
    }

    return NextResponse.json({
      donationId,
      senderUserId: started?.senderUserId ?? null,
      receiverUserId: started?.receiverUserId ?? null,
      amount: started?.amount ?? null,
      donationMode:
        started?.donationMode ?? "single",

      status,
      requiresManualReview:
        status === "FAILED_REQUIRES_REVIEW",

      events: trace,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 },
      );
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 },
      );
    }

    throw error;
  }
}

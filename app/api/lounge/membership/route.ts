import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  parseSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import { HybridUserRepository } from "@/lib/repositories/hybrid-user-repository";

import {
  activateTestLoungeMembership,
  cancelLoungeMembership,
  getLoungeMembershipByUserId,
} from "@/lib/lounge/lounge-membership-store";

async function getCurrentUser() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get(
      SESSION_COOKIE_NAME,
    )?.value;

  if (!token) {
    return null;
  }

  const session = parseSessionToken(token);

  if (!session?.userId) {
    return null;
  }

  const repository =
    new HybridUserRepository();

  return repository.findById(
    session.userId,
  );
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        membership: null,
      },
      { status: 401 },
    );
  }

  const membership =
    getLoungeMembershipByUserId(
      user.id,
    );

  return NextResponse.json({
    success: true,
    authenticated: true,
    membership,
  });
}

export async function POST(
  request: Request,
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  const body = await request
    .json()
    .catch(() => ({}));

  const action =
    typeof body.action === "string"
      ? body.action
      : "";

  if (action === "activate-test") {
    const months =
      Number.isInteger(body.months) &&
      body.months >= 1 &&
      body.months <= 12
        ? body.months
        : 1;

    const membership =
      activateTestLoungeMembership(
        user.id,
        months,
      );

    return NextResponse.json({
      success: true,
      membership,
    });
  }

  if (action === "cancel-test") {
    const membership =
      cancelLoungeMembership(
        user.id,
      );

    return NextResponse.json({
      success: true,
      membership,
    });
  }

  return NextResponse.json(
    {
      success: false,
      message:
        "지원하지 않는 요청입니다.",
    },
    { status: 400 },
  );
}

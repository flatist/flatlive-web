import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";
import {
  getFitActivityConfig,
  saveFitActivityConfig,
} from "@/lib/fit/fit-config-store";
import type {
  FitActivityRule,
} from "@/lib/fit/types";

function authErrorResponse(
  error: unknown,
) {
  if (
    error instanceof
    AuthenticationError
  ) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 },
    );
  }

  if (
    error instanceof
    AuthorizationError
  ) {
    return NextResponse.json(
      { error: error.message },
      { status: 403 },
    );
  }

  return null;
}

export async function GET() {
  try {
    await requirePermission(
      "WALLET_READ",
    );

    return NextResponse.json(
      await getFitActivityConfig(),
    );
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    throw error;
  }
}

export async function PUT(
  request: NextRequest,
) {
  try {
    await requirePermission(
      "WALLET_READ",
    );

    const body =
      await request.json();

    if (
      !body ||
      !Array.isArray(body.rules)
    ) {
      return NextResponse.json(
        {
          error:
            "rules 배열이 필요합니다.",
        },
        { status: 400 },
      );
    }

    const rules =
      body.rules as FitActivityRule[];

    const purchaseRewardPercent =
      typeof body.purchaseRewardPercent ===
      "number"
        ? body.purchaseRewardPercent
        : undefined;

    const saved =
      await saveFitActivityConfig(
        rules,
        purchaseRewardPercent,
      );

    return NextResponse.json(
      saved,
    );
  } catch (error) {
    const authResponse =
      authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    throw error;
  }
}

import { NextRequest, NextResponse } from "next/server";

import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";

import {
  WalletLedgerAdminService,
  type AdminLedgerSearchField,
} from "@/lib/admin/wallet-ledger-admin-service";

const ALLOWED_FIELDS: AdminLedgerSearchField[] = [
  "ALL",
  "OWNER_ID",
  "TRANSACTION_ID",
  "SOURCE_ID",
  "WALLET_ID",
];

export async function GET(request: NextRequest) {
  try {
    await requirePermission("WALLET_READ");

    const query =
      request.nextUrl.searchParams.get("q") ?? "";

    const rawField =
      request.nextUrl.searchParams.get("field") ?? "ALL";

    const field: AdminLedgerSearchField =
      ALLOWED_FIELDS.includes(
        rawField as AdminLedgerSearchField,
      )
        ? (rawField as AdminLedgerSearchField)
        : "ALL";

    const rawLimit =
      Number(request.nextUrl.searchParams.get("limit"));

    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.floor(rawLimit)
        : 100;

    const result =
      await new WalletLedgerAdminService().search({
        query,
        field,
        limit,
      });

    return NextResponse.json(result);
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

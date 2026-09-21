import { NextRequest, NextResponse } from "next/server";

import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";

import { MemberAdminService } from "@/lib/admin/member-admin-service";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("MEMBER_READ");

    const query =
      request.nextUrl.searchParams.get("q") ?? "";

    const members =
      await new MemberAdminService().listMembers(query);

    return NextResponse.json({
      members,
      count: members.length,
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

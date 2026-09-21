import {
  redirect,
} from "next/navigation";

import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";

import ReportsClient from "./ReportsClient";

export const dynamic =
  "force-dynamic";

export default async function AdminReportsPage() {
  try {
    await requirePermission(
      "REPORT_READ",
    );

    return (
      <ReportsClient />
    );
  } catch (error) {
    if (
      error instanceof
        AuthenticationError ||
      error instanceof
        AuthorizationError
    ) {
      redirect("/");
    }

    throw error;
  }
}

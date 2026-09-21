import {
  redirect,
} from "next/navigation";

import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";

import NoticesClient from "./NoticesClient";

export const dynamic =
  "force-dynamic";

export default async function AdminNoticesPage() {
  try {
    await requirePermission(
      "MEMBER_READ",
    );

    return <NoticesClient />;
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

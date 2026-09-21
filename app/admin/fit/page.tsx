import { redirect } from "next/navigation";

import FitSettingsClient from "./FitSettingsClient";

import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";

export default async function AdminFitPage() {
  try {
    await requirePermission(
      "WALLET_READ",
    );

    return (
      <FitSettingsClient />
    );
  } catch (error) {
    if (
      error instanceof
        AuthenticationError ||
      error instanceof
        AuthorizationError
    ) {
      redirect("/admin");
    }

    throw error;
  }
}

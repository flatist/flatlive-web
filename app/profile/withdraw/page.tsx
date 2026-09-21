import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import WithdrawAccountClient from "./WithdrawAccountClient";

import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export default async function WithdrawPage() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get(
      SESSION_COOKIE_NAME,
    )?.value ?? "";

  if (!token) {
    redirect("/login");
  }

  const snapshot =
    await new AuthService()
      .getCurrentUserSnapshot(token);

  if (!snapshot) {
    redirect("/login");
  }

  return (
    <WithdrawAccountClient
      username={snapshot.username}
    />
  );
}

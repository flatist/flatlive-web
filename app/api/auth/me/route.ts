import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { authCorsPreflight, withAuthCors } from "@/lib/auth/cors";

export function OPTIONS(request: Request) {
  return authCorsPreflight(request);
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return withAuthCors(
      request,
      NextResponse.json({ success: false, user: null }, { status: 401 }),
    );
  }

  const authService = new AuthService();
  const snapshot = await authService.getCurrentUserSnapshot(sessionToken);

  if (!snapshot) {
    return withAuthCors(
      request,
      NextResponse.json({ success: false, user: null }, { status: 401 }),
    );
  }

  return withAuthCors(
    request,
    NextResponse.json({
      success: true,
      user: {
        id: snapshot.userId,
        username: snapshot.username,
        email: snapshot.email,
        displayName: snapshot.displayName,
      },
      providers: snapshot.providers,
      serviceAccess: snapshot.serviceAccess,
    }),
  );
}

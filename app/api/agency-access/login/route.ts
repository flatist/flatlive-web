import { NextResponse } from "next/server";
import { authenticateAgencyAccessCode } from "@/lib/agency/access-code-store";
import {
  AGENCY_ACCESS_COOKIE_NAME,
  agencyPortalPathForScope,
  createAgencyAccessSessionToken,
  getAgencyAccessCookieOptions,
} from "@/lib/agency/access-session";

export const dynamic = "force-dynamic";

type Attempt = { count: number; resetAt: number };
const globalAttempts = globalThis as typeof globalThis & { __flatAgencyAccessAttempts?: Map<string, Attempt> };
const attempts = globalAttempts.__flatAgencyAccessAttempts ?? new Map<string, Attempt>();
globalAttempts.__flatAgencyAccessAttempts = attempts;

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export async function POST(request: Request) {
  try {
    const key = clientKey(request);
    const now = Date.now();
    const current = attempts.get(key);
    if (current && current.resetAt > now && current.count >= 5) {
      return NextResponse.json({ success: false, error: "접속 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
    }
    if (current && current.resetAt <= now) attempts.delete(key);

    const body = await request.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code : "";
    const access = await authenticateAgencyAccessCode(code).catch(() => null);
    if (!access) {
      const previous = attempts.get(key);
      attempts.set(key, { count: (previous?.count ?? 0) + 1, resetAt: previous?.resetAt && previous.resetAt > now ? previous.resetAt : now + 10 * 60 * 1000 });
      return NextResponse.json({ success: false, error: "접속코드를 확인해주세요." }, { status: 401 });
    }

    attempts.delete(key);
    const token = createAgencyAccessSessionToken(access);
    const response = NextResponse.json({ success: true, redirectTo: agencyPortalPathForScope(access.scopeType), scopeType: access.scopeType, label: access.label });
    response.cookies.set(AGENCY_ACCESS_COOKIE_NAME, token, getAgencyAccessCookieOptions());
    return response;
  } catch (error) {
    console.error("AGENCY_ACCESS_LOGIN_FAILED", error);
    return NextResponse.json({ success: false, error: "조직 전용 접속에 실패했습니다." }, { status: 500 });
  }
}

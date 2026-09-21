import { NextResponse } from "next/server";
import { AGENCY_ACCESS_COOKIE_NAME, getAgencyAccessCookieOptions } from "@/lib/agency/access-session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(AGENCY_ACCESS_COOKIE_NAME, "", { ...getAgencyAccessCookieOptions(), maxAge: 0 });
  return response;
}

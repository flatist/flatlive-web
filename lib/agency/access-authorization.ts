import { cookies } from "next/headers";
import {
  AGENCY_ACCESS_COOKIE_NAME,
  parseAgencyAccessSessionToken,
  type AgencyAccessSession,
} from "./access-session";
import type { AgencyScopeType } from "./access-code-store";

export async function getAgencyAccessSession(): Promise<AgencyAccessSession | null> {
  const token = (await cookies()).get(AGENCY_ACCESS_COOKIE_NAME)?.value;
  return token ? parseAgencyAccessSessionToken(token) : null;
}

export async function requireAgencyAccess(expected?: AgencyScopeType): Promise<AgencyAccessSession> {
  const session = await getAgencyAccessSession();
  if (!session) throw new Error("AGENCY_ACCESS_AUTH_REQUIRED");
  if (expected && session.scopeType !== expected) throw new Error("AGENCY_ACCESS_SCOPE_MISMATCH");
  return session;
}

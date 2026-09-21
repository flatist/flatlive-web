import crypto from "crypto";
import type { AgencyScopeType } from "./access-code-store";

export const AGENCY_ACCESS_COOKIE_NAME = "flatlive_agency_access";
const SESSION_SECRET = process.env.AGENCY_ACCESS_SESSION_SECRET || process.env.AUTH_SESSION_SECRET || "flatlive-dev-agency-access-secret";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export type AgencyAccessSession = {
  accessId: string;
  scopeType: AgencyScopeType;
  scopeId: string;
  label: string;
  iat: number;
  exp: number;
};

export function createAgencyAccessSessionToken(input: Omit<AgencyAccessSession, "iat" | "exp">) {
  const now = Date.now();
  const payload: AgencyAccessSession = { ...input, iat: now, exp: now + SESSION_TTL_MS };
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function parseAgencyAccessSessionToken(token: string): AgencyAccessSession | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(`${header}.${payload}`).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AgencyAccessSession;
    if (!parsed || !parsed.accessId || !parsed.scopeId || !parsed.scopeType || !parsed.exp || parsed.exp <= Date.now()) return null;
    if (!(["HEAD", "BRANCH", "AGENCY"] as const).includes(parsed.scopeType)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getAgencyAccessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" || process.env.AUTH_COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

export function agencyPortalPathForScope(scopeType: AgencyScopeType) {
  if (scopeType === "HEAD") return "/agency-portal/head";
  if (scopeType === "BRANCH") return "/agency-portal/branch";
  return "/agency-portal/agency";
}

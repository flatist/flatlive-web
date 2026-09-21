import crypto from "crypto";

export const SESSION_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "flatlive_session";
const SESSION_SECRET = process.env.AUTH_SESSION_SECRET || "flatlive-dev-session-secret";

export function createSessionToken(userId: string, email: string) {
  const payload = {
    userId,
    email,
    iat: Date.now(),
  };

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

export function parseSessionToken(token: string) {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [header, payload, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  const signatureBuffer =
    Buffer.from(signature);

  const expectedSignatureBuffer =
    Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !==
    expectedSignatureBuffer.length
  ) {
    return null;
  }

  if (
    !crypto.timingSafeEqual(
      signatureBuffer,
      expectedSignatureBuffer,
    )
  ) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId: string;
      email: string;
    };
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite: (process.env.AUTH_COOKIE_SAME_SITE || "lax") as "lax" | "strict" | "none",
    secure: process.env.AUTH_COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

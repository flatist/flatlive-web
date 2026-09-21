import { NextResponse } from "next/server";

function getConfiguredOrigins() {
  return new Set(
    (process.env.AUTH_CORS_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function isPrivateDevOrigin(origin: string) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  try {
    const url = new URL(origin);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    if (url.port !== "8081") {
      return false;
    }

    const host = url.hostname;

    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      /^10\.\d+\.\d+\.\d+$/.test(host) ||
      /^192\.168\.\d+\.\d+$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)
    );
  } catch {
    return false;
  }
}

function getAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return null;
  }

  const configuredOrigins = getConfiguredOrigins();

  if (
    configuredOrigins.has(origin) ||
    isPrivateDevOrigin(origin)
  ) {
    return origin;
  }

  return null;
}

export function withAuthCors(
  request: Request,
  response: NextResponse,
) {
  const origin = getAllowedOrigin(request);

  if (!origin) {
    return response;
  }

  response.headers.set(
    "Access-Control-Allow-Origin",
    origin,
  );

  response.headers.set(
    "Access-Control-Allow-Credentials",
    "true",
  );

  response.headers.append(
    "Vary",
    "Origin",
  );

  return response;
}

export function authCorsPreflight(
  request: Request,
) {
  const response =
    new NextResponse(null, {
      status: 204,
    });

  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS",
  );

  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type",
  );

  response.headers.set(
    "Access-Control-Max-Age",
    "86400",
  );

  return withAuthCors(
    request,
    response,
  );
}

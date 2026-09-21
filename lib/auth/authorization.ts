import { cookies } from "next/headers";

import {
  parseSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  roleHasPermission,
  type Permission,
  type Role,
} from "@/lib/auth/permissions";

import { getUserRole } from "@/lib/auth/role-store";

export type AuthorizedUser = {
  userId: string;
  email: string;
  role: Role;
};

export class AuthenticationError extends Error {
  status = 401;

  constructor() {
    super("로그인이 필요합니다.");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  status = 403;

  constructor(permission: Permission) {
    super(`권한이 없습니다: ${permission}`);
    this.name = "AuthorizationError";
  }
}

export async function requireAuthenticatedUser(): Promise<AuthorizedUser> {
  const token = (await cookies()).get(
    SESSION_COOKIE_NAME,
  )?.value;

  const session = token
    ? parseSessionToken(token)
    : null;

  if (!session) {
    throw new AuthenticationError();
  }

  const role = await getUserRole(session.userId);

  return {
    userId: session.userId,
    email: session.email,
    role,
  };
}

export async function requirePermission(
  permission: Permission,
): Promise<AuthorizedUser> {
  const user = await requireAuthenticatedUser();

  if (!roleHasPermission(user.role, permission)) {
    throw new AuthorizationError(permission);
  }

  return user;
}

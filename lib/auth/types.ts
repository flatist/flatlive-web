export type UserId = string;

export type ClientCode = "FLATLIVE" | "GOGOREALBOX" | "SIA_ANGEL";
export type LoginProvider = "PASSWORD" | "GOOGLE" | "APPLE" | "KAKAO";
export type ServiceAccessStatus =
  | "NOT_JOINED"
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "WITHDRAWN";
export type ConsentStatus = "GRANTED" | "REVOKED" | "PENDING";
export type ConsentType =
  | "TERMS"
  | "PRIVACY"
  | "OPERATION_POLICY"
  | "AGE_CONFIRMATION"
  | "MARKETING"
  | "CREATOR_POLICY"
  | "MUSIC_IP_POLICY"
  | "DATA_PROCESSING";

export type UnifiedUserRecord = {
  id: UserId;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  createdAt: string;
  updatedAt: string;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
};

export type UserRecord = {
  id: UserId;
  username: string;
  email: string;
  displayName: string;
  birthDate?: string | null;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type LoginIdentityRecord = {
  id: string;
  userId: UserId;
  provider: LoginProvider;
  providerUserId?: string;
  username?: string;
  email?: string;
  passwordHash?: string;
  emailVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientRecord = {
  id: string;
  code: ClientCode;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

export type ServiceAccessRecord = {
  id: string;
  userId: UserId;
  clientId: string;
  status: ServiceAccessStatus;
  joinedAt?: string | null;
  lastAccessAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConsentRecord = {
  id: string;
  userId: UserId;
  clientId: string;
  consentType: ConsentType;
  version: string;
  status: ConsentStatus;
  grantedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthSession = {
  userId: UserId;
  email: string;
  issuedAt: string;
  expiresAt: string;
};

export type AuthUser = {
  id: UserId;
  username: string;
  email: string;
  displayName: string;
};

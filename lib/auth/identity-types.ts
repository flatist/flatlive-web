export type UnifiedUserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type ClientCode = "FLATLIVE" | "GOGOREALBOX" | "SIA_ANGEL";
export const LOGIN_PROVIDERS = ["PASSWORD", "GOOGLE", "APPLE", "KAKAO"] as const;
export type LoginProvider = (typeof LOGIN_PROVIDERS)[number];
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

export type UnifiedUser = {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  status: UnifiedUserStatus;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  displayName?: string;
  username?: string;
  email?: string;
  birthDate?: string | null;
};

export type LoginIdentity = {
  id: string;
  identityId: string;
  userId: string;
  provider: LoginProvider;
  providerUserId?: string;
  loginIdentifier: string;
  verified: boolean;
  username?: string;
  email?: string;
  passwordHash?: string;
  emailVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Client = {
  id: string;
  code: ClientCode;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

export type ServiceAccess = {
  id: string;
  userId: string;
  service: ClientCode;
  clientId: string;
  status: ServiceAccessStatus;
  joinedAt?: string | null;
  lastAccessAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Consent = {
  id: string;
  userId: string;
  clientId: string;
  consentType: ConsentType;
  version: string;
  status: ConsentStatus;
  grantedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

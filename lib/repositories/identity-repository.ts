import type {
  Client,
  Consent,
  LoginIdentity,
  ServiceAccess,
  UnifiedUser,
} from "@/lib/auth/identity-types";
import type {
  EmailVerificationToken,
  PasswordResetToken,
} from "@/lib/auth/token-types";

export type UserRepositoryRecord = UnifiedUser & {
  email?: string;
  username?: string;
  displayName?: string;
  passwordHash?: string;
};

export interface IdentityRepository {
  findUnifiedUserById(id: string): Promise<UnifiedUser | null>;
  findUnifiedUserByEmail(email: string): Promise<UnifiedUser | null>;
  findUnifiedUserByUsername(username: string): Promise<UnifiedUser | null>;
  createUnifiedUser(user: Omit<UnifiedUser, "createdAt" | "updatedAt">): Promise<UnifiedUser>;
  updateUnifiedUser(id: string, updates: Partial<UnifiedUser>): Promise<UnifiedUser | null>;
  findLoginIdentityByUsername(username: string): Promise<LoginIdentity | null>;
  findLoginIdentityByEmail(email: string): Promise<LoginIdentity | null>;
  findLoginIdentityByUserId(userId: string, provider?: string): Promise<LoginIdentity | null>;
  findLoginIdentitiesByUserId(userId: string): Promise<LoginIdentity[]>;
  createLoginIdentity(identity: Omit<LoginIdentity, "createdAt" | "updatedAt">): Promise<LoginIdentity>;
  findClientByCode(code: string): Promise<Client | null>;
  createServiceAccess(access: Omit<ServiceAccess, "createdAt" | "updatedAt">): Promise<ServiceAccess>;
  findServiceAccess(userId: string, clientId: string): Promise<ServiceAccess | null>;
  updateServiceAccess(
    userId: string,
    clientId: string,
    updates: Partial<ServiceAccess>,
  ): Promise<ServiceAccess | null>;
  findServiceAccessByUserId(userId: string, service?: string): Promise<ServiceAccess | null>;
  createConsent(consent: Omit<Consent, "createdAt" | "updatedAt">): Promise<Consent>;
  findConsent(userId: string, clientId: string, consentType: string): Promise<Consent | null>;
  // 이메일 인증 토큰
  createEmailVerificationToken(
    token: Omit<EmailVerificationToken, "createdAt">,
  ): Promise<EmailVerificationToken>;
  findEmailVerificationToken(userId: string): Promise<EmailVerificationToken | null>;
  markEmailVerificationTokenAsUsed(tokenId: string): Promise<void>;
  // 비밀번호 재설정 토큰
  createPasswordResetToken(
    token: Omit<PasswordResetToken, "createdAt">,
  ): Promise<PasswordResetToken>;
  findPasswordResetToken(userId: string): Promise<PasswordResetToken | null>;
  markPasswordResetTokenAsUsed(tokenId: string): Promise<void>;
}

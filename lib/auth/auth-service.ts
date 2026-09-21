import { HybridIdentityRepository } from "@/lib/repositories/hybrid-identity-repository";

import {
  createUnifiedUserId,
  createLoginIdentityId,
  createServiceAccessId,
  createConsentId,
} from "@/lib/repositories/local-identity-repository";

import type { AuthUser, UserRecord } from "@/lib/auth/types";
import {
  validateDisplayName,
  validateEmail,
  validatePasswordPolicy,
  validateUsername,
} from "@/lib/auth/validation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, parseSessionToken } from "@/lib/auth/session";
import { LocalIdentityLinkingService } from "@/lib/auth/identity-linking";

import { createUserId } from "@/lib/repositories/local-user-repository";
import { HybridUserRepository } from "@/lib/repositories/hybrid-user-repository";
import { toAuthUser, type UserRepository } from "@/lib/repositories/user-repository";
import { TokenProvider } from "@/lib/auth/token-provider";
import { getEmailProvider } from "@/lib/auth/email-provider";
import type { TokenValidationResult } from "@/lib/auth/token-types";

export type RegisterInput = {
  username: string;
  email: string;
  displayName: string;
  password: string;
  confirmPassword: string;
  birthDate: string;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  operationPolicyAccepted?: boolean;
  ageConfirmed?: boolean;
  marketingAccepted?: boolean;
};

export type LoginInput = {
  username: string;
  password: string;
};

export type CurrentUserSnapshot = {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  providers: Array<{
    provider: string;
    loginIdentifier: string;
    verified: boolean;
    providerUserId?: string;
  }>;
  serviceAccess: {
    service: "FLATLIVE" | "GOGOREALBOX" | "SIA_ANGEL";
    status: string;
    joinedAt?: string | null;
  } | null;
};

export class AuthService {
  private readonly identityLinkingService: LocalIdentityLinkingService;

  constructor(
    private readonly userRepository: UserRepository = new HybridUserRepository(),
    private readonly identityRepository = new HybridIdentityRepository(),
    identityLinkingService?: LocalIdentityLinkingService,
  ) {
    this.identityLinkingService =
      identityLinkingService ??
      new LocalIdentityLinkingService(this.identityRepository);
  }

  async register({
    username,
    email,
    displayName,
    password,
    confirmPassword,
    birthDate,
    termsAccepted,
    privacyAccepted,
    operationPolicyAccepted,
    ageConfirmed,
    marketingAccepted,
  }: RegisterInput) {
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim();
    const normalizedDisplayName = displayName.trim();
    const normalizedBirthDate = birthDate.trim();

    if (!normalizedBirthDate) {
      return {
        success: false,
        error: "생년월일을 입력해주세요.",
      } as const;
    }

    const birthMatch =
      /^(\d{4})-(\d{2})-(\d{2})$/.exec(
        normalizedBirthDate,
      );

    if (!birthMatch) {
      return {
        success: false,
        error: "생년월일 형식이 올바르지 않습니다.",
      } as const;
    }

    const birthYear = Number(birthMatch[1]);
    const birthMonth = Number(birthMatch[2]);
    const birthDay = Number(birthMatch[3]);

    const birth =
      new Date(
        Date.UTC(
          birthYear,
          birthMonth - 1,
          birthDay,
        ),
      );

    if (
      birth.getUTCFullYear() !== birthYear ||
      birth.getUTCMonth() !== birthMonth - 1 ||
      birth.getUTCDate() !== birthDay
    ) {
      return {
        success: false,
        error: "생년월일을 다시 확인해주세요.",
      } as const;
    }

    const today = new Date();

    let age =
      today.getUTCFullYear() -
      birthYear;

    const birthdayPassed =
      today.getUTCMonth() + 1 >
        birthMonth ||
      (
        today.getUTCMonth() + 1 ===
          birthMonth &&
        today.getUTCDate() >=
          birthDay
      );

    if (!birthdayPassed) {
      age -= 1;
    }

    if (age < 18) {
      return {
        success: false,
        error: "만 18세 이상만 가입할 수 있습니다.",
      } as const;
    }

    if (age > 120) {
      return {
        success: false,
        error: "생년월일을 다시 확인해주세요.",
      } as const;
    }

    if (
      termsAccepted !== true ||
      privacyAccepted !== true ||
      operationPolicyAccepted !== true ||
      ageConfirmed !== true
    ) {
      return {
        success: false,
        error: "필수 약관 및 연령 확인에 모두 동의해주세요.",
      } as const;
    }

    const usernameError = validateUsername(normalizedUsername);
    if (usernameError) {
      return { success: false, error: usernameError } as const;
    }

    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      return { success: false, error: emailError } as const;
    }

    const displayNameError = validateDisplayName(normalizedDisplayName);
    if (displayNameError) {
      return { success: false, error: displayNameError } as const;
    }

    const passwordPolicyError = validatePasswordPolicy(password);
    if (passwordPolicyError) {
      return { success: false, error: passwordPolicyError } as const;
    }

    if (!confirmPassword || password !== confirmPassword) {
      return { success: false, error: "비밀번호 확인이 일치하지 않습니다." } as const;
    }

    const existingByUsername = await this.userRepository.findByUsername(normalizedUsername);
    if (existingByUsername) {
      return { success: false, error: "이미 사용 중인 아이디입니다." } as const;
    }

    const existingByEmail = await this.userRepository.findByEmail(normalizedEmail);
    if (existingByEmail) {
      return { success: false, error: "이미 등록된 이메일입니다." } as const;
    }

    const flatliveClient =
      await this.identityRepository.findClientByCode(
        "FLATLIVE",
      );

    if (!flatliveClient) {
      return {
        success: false,
        error: "FLAT LIVE 서비스 정보를 찾지 못했습니다.",
      } as const;
    }

    const passwordHash = hashPassword(password);
    const user = await this.userRepository.create({
      id: createUserId(),
      username: normalizedUsername,
      email: normalizedEmail,
      displayName: normalizedDisplayName,
      birthDate: normalizedBirthDate,
      passwordHash,
    } as Omit<UserRecord, "createdAt" | "updatedAt">);

    await this.identityRepository.createUnifiedUser({
      id: user.id,
      userId: user.id,
      status: "ACTIVE",
      displayName: normalizedDisplayName,
      username: normalizedUsername,
      email: normalizedEmail,
      birthDate: normalizedBirthDate,
      emailVerifiedAt: null,
      lastLoginAt: null,
    });

    await this.identityLinkingService.ensurePasswordIdentity(
      user.id,
      normalizedUsername,
      normalizedEmail,
      passwordHash,
    );

    await this.identityLinkingService.ensureServiceAccess(
      user.id,
      "FLATLIVE",
    );

    const termsVersion = "2026-05-22";
    const privacyVersion = "2026-05-22";
    const operationPolicyVersion = "2026-05-22";
    const ageConfirmationVersion = "2026-05-22";
    const marketingVersion = "2026-05-22";
    const grantedAt = new Date().toISOString();

    await this.identityRepository.createConsent({
      id: createConsentId(),
      userId: user.id,
      clientId: flatliveClient.id,
      consentType: "TERMS",
      version: termsVersion,
      status: "GRANTED",
      grantedAt,
      revokedAt: null,
    });

    await this.identityRepository.createConsent({
      id: createConsentId(),
      userId: user.id,
      clientId: flatliveClient.id,
      consentType: "PRIVACY",
      version: privacyVersion,
      status: "GRANTED",
      grantedAt,
      revokedAt: null,
    });

    await this.identityRepository.createConsent({
      id: createConsentId(),
      userId: user.id,
      clientId: flatliveClient.id,
      consentType: "OPERATION_POLICY",
      version: operationPolicyVersion,
      status: "GRANTED",
      grantedAt,
      revokedAt: null,
    });

    await this.identityRepository.createConsent({
      id: createConsentId(),
      userId: user.id,
      clientId: flatliveClient.id,
      consentType: "AGE_CONFIRMATION",
      version: ageConfirmationVersion,
      status: "GRANTED",
      grantedAt,
      revokedAt: null,
    });

    if (marketingAccepted === true) {
      await this.identityRepository.createConsent({
        id: createConsentId(),
        userId: user.id,
        clientId: flatliveClient.id,
        consentType: "MARKETING",
        version: marketingVersion,
        status: "GRANTED",
        grantedAt,
        revokedAt: null,
      });
    }

    const sessionToken = createSessionToken(user.id, user.email);

    return {
      success: true,
      user: toAuthUser(user),
      sessionToken,
    } as const;
  }

  async login({ username, password }: LoginInput) {
    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password) {
      return { success: false, error: "아이디와 비밀번호를 모두 입력해주세요." } as const;
    }

    const existing = await this.userRepository.findByUsername(normalizedUsername);
    if (!existing) {
      return { success: false, error: "등록되지 않은 아이디입니다." } as const;
    }

    const unifiedUser =
      await this.identityRepository.findUnifiedUserById(
        existing.id,
      );

    if (
      unifiedUser?.status === "DELETED"
    ) {
      return {
        success: false,
        error: "탈퇴한 계정입니다.",
      } as const;
    }

    if (
      unifiedUser?.status === "SUSPENDED"
    ) {
      return {
        success: false,
        error: "이용이 정지된 계정입니다.",
      } as const;
    }

    const flatliveAccess =
      await this.identityRepository.findServiceAccess(
        existing.id,
        "cl_flatlive",
      );

    if (
      flatliveAccess?.status === "WITHDRAWN"
    ) {
      return {
        success: false,
        error: "탈퇴한 계정입니다.",
      } as const;
    }

    const isValidPassword = verifyPassword(password, existing.passwordHash);
    if (!isValidPassword) {
      return { success: false, error: "비밀번호가 올바르지 않습니다." } as const;
    }

    await this.identityLinkingService.ensurePasswordIdentity(
      existing.id,
      existing.username,
      existing.email,
      existing.passwordHash,
    );

    const sessionToken = createSessionToken(existing.id, existing.email);

    return {
      success: true,
      user: toAuthUser(existing),
      sessionToken,
    } as const;
  }

  async withdrawAccount(
    token: string,
    password: string,
  ) {
    if (!token) {
      return {
        success: false,
        error: "로그인이 필요합니다.",
      } as const;
    }

    const payload =
      parseSessionToken(token);

    if (!payload?.userId) {
      return {
        success: false,
        error: "로그인이 필요합니다.",
      } as const;
    }

    const user =
      await this.userRepository.findById(
        payload.userId,
      );

    if (!user) {
      return {
        success: false,
        error: "회원 정보를 찾을 수 없습니다.",
      } as const;
    }

    if (!password) {
      return {
        success: false,
        error: "비밀번호를 입력해주세요.",
      } as const;
    }

    if (
      !verifyPassword(
        password,
        user.passwordHash,
      )
    ) {
      return {
        success: false,
        error: "비밀번호가 올바르지 않습니다.",
      } as const;
    }

    const unifiedUser =
      await this.identityRepository.findUnifiedUserById(
        user.id,
      );

    if (
      unifiedUser?.status === "DELETED"
    ) {
      return {
        success: false,
        error: "이미 탈퇴한 계정입니다.",
      } as const;
    }

    const access =
      await this.identityRepository.findServiceAccess(
        user.id,
        "cl_flatlive",
      );

    await this.identityRepository.updateUnifiedUser(
      user.id,
      {
        status: "DELETED",
      },
    );

    if (access) {
      await this.identityRepository.updateServiceAccess(
        user.id,
        "cl_flatlive",
        {
          status: "WITHDRAWN",
          lastAccessAt:
            new Date().toISOString(),
        },
      );
    }

    return {
      success: true,
      userId: user.id,
    } as const;
  }

  async getUserBySessionToken(token: string): Promise<AuthUser | null> {
    if (!token) return null;

    const payload = parseSessionToken(token);
    if (!payload?.userId) return null;

    const user = await this.userRepository.findById(payload.userId);
    if (!user) return null;

    const unifiedUser =
      await this.identityRepository.findUnifiedUserById(
        user.id,
      );

    if (
      !unifiedUser ||
      unifiedUser.status !== "ACTIVE"
    ) {
      return null;
    }

    const flatliveAccess =
      await this.identityRepository.findServiceAccess(
        user.id,
        "cl_flatlive",
      );

    if (
      !flatliveAccess ||
      flatliveAccess.status !== "ACTIVE"
    ) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
    };
  }

  async getCurrentUserSnapshot(token: string): Promise<CurrentUserSnapshot | null> {
    if (!token) return null;

    const payload = parseSessionToken(token);
    if (!payload?.userId) return null;

    const user = await this.userRepository.findById(payload.userId);
    if (!user) return null;

    const unifiedUser =
      await this.identityRepository.findUnifiedUserById(
        user.id,
      );

    if (
      !unifiedUser ||
      unifiedUser.status !== "ACTIVE"
    ) {
      return null;
    }

    const activeAccess =
      await this.identityRepository.findServiceAccess(
        user.id,
        "cl_flatlive",
      );

    if (
      !activeAccess ||
      activeAccess.status !== "ACTIVE"
    ) {
      return null;
    }

    const providers = await this.identityLinkingService.findProvidersByUserId(user.id);
    const serviceAccess = await this.identityLinkingService.getServiceAccessStatus(user.id, "FLATLIVE");

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      providers,
      serviceAccess,
    };
  }

  /**
   * 이메일 인증 토큰 생성 및 발송
   * 계정 존재 여부를 외부에 노출하지 않기 위해 항상 success 반환
   */
  async sendVerificationEmail(email: string) {
    const normalizedEmail = email.trim();

    // 계정 존재 여부를 확인하지만 외부에는 알리지 않음
    const unifiedUser = await this.identityRepository.findUnifiedUserByEmail(normalizedEmail);
    if (!unifiedUser) {
      // 존재하지 않는 이메일도 동일한 응답 반환
      return {
        success: true,
        message: "인증 이메일을 발송했습니다. 받은 편지함을 확인해주세요.",
      } as const;
    }

    // 이전 토큰이 있으면 새 토큰으로 대체
    const token = TokenProvider.generateToken();
    const tokenHash = TokenProvider.hashToken(token);
    const expiresAt = TokenProvider.getEmailVerificationTokenExpiry();

    await this.identityRepository.createEmailVerificationToken({
      id: `evt_${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId: unifiedUser.userId,
      tokenHash,
      expiresAt,
      usedAt: null,
    });

    // 실제 이메일 발송 (개발 환경에서는 mock)
    const emailProvider = getEmailProvider();
    await emailProvider.sendVerificationEmail({
      to: normalizedEmail,
      username: unifiedUser.username || normalizedEmail,
      token,
    });

    // 성공 여부와 관계없이 동일한 응답
    return {
      success: true,
      message: "인증 이메일을 발송했습니다. 받은 편지함을 확인해주세요.",
    } as const;
  }

  /**
   * 이메일 인증 토큰 검증 및 확인 처리
   */
  async verifyEmailToken(userId: string, token: string): Promise<TokenValidationResult> {
    if (!token) {
      return { valid: false, reason: "invalid" };
    }

    const tokenRecord = await this.identityRepository.findEmailVerificationToken(userId);
    if (!tokenRecord) {
      return { valid: false, reason: "not_found" };
    }

    // 토큰 만료 확인
    if (TokenProvider.isTokenExpired(tokenRecord.expiresAt)) {
      return { valid: false, reason: "expired" };
    }

    // 토큰 1회 사용 확인
    if (TokenProvider.isTokenUsed(tokenRecord.usedAt)) {
      return { valid: false, reason: "already_used" };
    }

    // 토큰 해시 검증
    if (!TokenProvider.verifyTokenHash(token, tokenRecord.tokenHash)) {
      return { valid: false, reason: "invalid" };
    }

    return { valid: true, userId };
  }

  /**
   * 이메일 인증 완료 처리
   */
  async completeEmailVerification(userId: string, token: string) {
    const validation = await this.verifyEmailToken(userId, token);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.reason === "expired" ? "인증 링크가 만료되었습니다." : "잘못된 인증 링크입니다.",
      } as const;
    }

    const tokenRecord = await this.identityRepository.findEmailVerificationToken(userId);
    if (!tokenRecord) {
      return { success: false, error: "잘못된 요청입니다." } as const;
    }

    // 토큰 사용 처리
    await this.identityRepository.markEmailVerificationTokenAsUsed(tokenRecord.id);

    // UnifiedUser의 이메일 인증 완료
    const now = new Date().toISOString();
    await this.identityRepository.updateUnifiedUser(userId, {
      emailVerifiedAt: now,
    });

    return { success: true } as const;
  }

  /**
   * 비밀번호 재설정 이메일 발송
   * 계정 존재 여부를 외부에 노출하지 않기 위해 항상 success 반환
   */
  async sendPasswordResetEmail(email: string) {
    const normalizedEmail = email.trim();

    // 계정 존재 여부를 확인하지만 외부에는 알리지 않음
    const unifiedUser = await this.identityRepository.findUnifiedUserByEmail(normalizedEmail);
    if (!unifiedUser) {
      // 존재하지 않는 이메일도 동일한 응답 반환
      return {
        success: true,
        message: "비밀번호 재설정 이메일을 발송했습니다. 받은 편지함을 확인해주세요.",
      } as const;
    }

    // 비밀번호 재설정 토큰 생성
    const token = TokenProvider.generateToken();
    const tokenHash = TokenProvider.hashToken(token);
    const expiresAt = TokenProvider.getPasswordResetTokenExpiry();

    await this.identityRepository.createPasswordResetToken({
      id: `prt_${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId: unifiedUser.userId,
      tokenHash,
      expiresAt,
      usedAt: null,
    });

    // 실제 이메일 발송 (개발 환경에서는 mock)
    const emailProvider = getEmailProvider();
    await emailProvider.sendPasswordResetEmail({
      to: normalizedEmail,
      username: unifiedUser.username || normalizedEmail,
      token,
    });

    // 성공 여부와 관계없이 동일한 응답
    return {
      success: true,
      message: "비밀번호 재설정 이메일을 발송했습니다. 받은 편지함을 확인해주세요.",
    } as const;
  }

  /**
   * 비밀번호 재설정 토큰 검증
   */
  async validatePasswordResetToken(userId: string, token: string): Promise<TokenValidationResult> {
    if (!token) {
      return { valid: false, reason: "invalid" };
    }

    const tokenRecord = await this.identityRepository.findPasswordResetToken(userId);
    if (!tokenRecord) {
      return { valid: false, reason: "not_found" };
    }

    // 토큰 만료 확인
    if (TokenProvider.isTokenExpired(tokenRecord.expiresAt)) {
      return { valid: false, reason: "expired" };
    }

    // 토큰 1회 사용 확인
    if (TokenProvider.isTokenUsed(tokenRecord.usedAt)) {
      return { valid: false, reason: "already_used" };
    }

    // 토큰 해시 검증
    if (!TokenProvider.verifyTokenHash(token, tokenRecord.tokenHash)) {
      return { valid: false, reason: "invalid" };
    }

    return { valid: true, userId };
  }

  /**
   * 비밀번호 재설정 완료
   */
  async resetPassword(userId: string, token: string, newPassword: string, confirmPassword: string) {
    const validation = await this.validatePasswordResetToken(userId, token);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.reason === "expired" ? "재설정 링크가 만료되었습니다." : "잘못된 재설정 링크입니다.",
      } as const;
    }

    // 새 비밀번호 검증
    if (!newPassword || !confirmPassword) {
      return { success: false, error: "비밀번호를 입력해주세요." } as const;
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: "비밀번호 확인이 일치하지 않습니다." } as const;
    }

    const passwordPolicyError = validatePasswordPolicy(newPassword);
    if (passwordPolicyError) {
      return { success: false, error: passwordPolicyError } as const;
    }

    // 토큰 사용 처리
    const tokenRecord = await this.identityRepository.findPasswordResetToken(userId);
    if (!tokenRecord) {
      return { success: false, error: "잘못된 요청입니다." } as const;
    }

    await this.identityRepository.markPasswordResetTokenAsUsed(tokenRecord.id);

    // 비밀번호 해시 및 저장
    const newPasswordHash = hashPassword(newPassword);

    // UserRepository에서 비밀번호 업데이트
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return { success: false, error: "사용자를 찾을 수 없습니다." } as const;
    }

    await this.userRepository.update(userId, {
      passwordHash: newPasswordHash,
    });

    return { success: true } as const;
  }
}

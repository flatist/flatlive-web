/**
 * 이메일 인증 토큰
 * - 원본 토큰은 발행 시에만 사용자에게 전달
 * - DB에는 해시된 값만 저장
 * - 1회 사용 후 폐기
 * - 만료 시간 적용
 */
export type EmailVerificationToken = {
  id: string;
  userId: string;
  tokenHash: string; // SHA256 hashed token
  expiresAt: string; // ISO 8601
  usedAt?: string | null; // 사용 시간 (null이면 미사용)
  createdAt: string;
};

/**
 * 비밀번호 재설정 토큰
 * - 원본 토큰은 발행 시에만 사용자에게 전달 (이메일로)
 * - DB에는 해시된 값만 저장
 * - 1회 사용 후 폐기
 * - 만료 시간 적용
 */
export type PasswordResetToken = {
  id: string;
  userId: string;
  tokenHash: string; // SHA256 hashed token
  expiresAt: string; // ISO 8601
  usedAt?: string | null; // 사용 시간 (null이면 미사용)
  createdAt: string;
};

/**
 * 토큰 검증 결과
 */
export type TokenValidationResult = {
  valid: boolean;
  reason?: "expired" | "not_found" | "already_used" | "invalid";
  userId?: string;
};

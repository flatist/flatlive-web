import crypto from "crypto";

const TOKEN_LENGTH = 32; // 256 bits = 32 bytes
const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;
const PASSWORD_RESET_EXPIRY_HOURS = 1;

/**
 * 토큰 생성
 * - 충분히 예측하기 어려운 랜덤 토큰
 * - Base64 URL-safe 포맷
 */
export function generateToken(length: number = TOKEN_LENGTH): string {
  return crypto.randomBytes(length).toString("base64url");
}

/**
 * 토큰을 SHA256으로 해싱
 * - DB 저장용 (원본 보호)
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * 토큰과 해시 비교
 */
export function verifyTokenHash(token: string, tokenHash: string): boolean {
  return hashToken(token) === tokenHash;
}

/**
 * 이메일 인증 토큰 만료 시간 계산
 */
export function getEmailVerificationTokenExpiry(): string {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + EMAIL_VERIFICATION_EXPIRY_HOURS);
  return expiresAt.toISOString();
}

/**
 * 비밀번호 재설정 토큰 만료 시간 계산
 */
export function getPasswordResetTokenExpiry(): string {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_EXPIRY_HOURS);
  return expiresAt.toISOString();
}

/**
 * 토큰 만료 여부 확인
 */
export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

/**
 * 토큰이 이미 사용되었는지 확인
 */
export function isTokenUsed(usedAt: string | null | undefined): boolean {
  return usedAt !== null && usedAt !== undefined;
}

export const TokenProvider = {
  generateToken,
  hashToken,
  verifyTokenHash,
  getEmailVerificationTokenExpiry,
  getPasswordResetTokenExpiry,
  isTokenExpired,
  isTokenUsed,
};


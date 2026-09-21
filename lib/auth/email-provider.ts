/**
 * 이메일 발송 서비스 인터페이스
 * 실제 이메일 프로바이더(SendGrid, AWS SES, Resend 등)를 나중에 연결 가능
 */
export interface IEmailProvider {
  /**
   * 이메일 인증 이메일 발송
   */
  sendVerificationEmail(params: {
    to: string;
    username: string;
    token: string; // 원본 토큰 (URL에 포함될 값)
  }): Promise<{ success: boolean; error?: string }>;

  /**
   * 비밀번호 재설정 이메일 발송
   */
  sendPasswordResetEmail(params: {
    to: string;
    username: string;
    token: string; // 원본 토큰 (URL에 포함될 값)
  }): Promise<{ success: boolean; error?: string }>;
}

/**
 * 개발/테스트용 Mock 이메일 프로바이더
 * 실제 이메일을 발송하지 않고 토큰만 로깅
 */
export class MockEmailProvider implements IEmailProvider {
  private sentEmails: Array<{
    to: string;
    type: "verification" | "reset";
    token: string;
    timestamp: string;
  }> = [];

  async sendVerificationEmail(params: {
    to: string;
    username: string;
    token: string;
  }): Promise<{ success: boolean; error?: string }> {
    this.sentEmails.push({
      to: params.to,
      type: "verification",
      token: params.token,
      timestamp: new Date().toISOString(),
    });

    // 개발 환경에서는 콘솔에 토큰 로깅 (실제 서비스에서는 제거)
    if (process.env.NODE_ENV !== "production") {
      console.log(`[MockEmailProvider] Verification email sent to ${params.to}`);
      console.log(`[MockEmailProvider] Token: ${params.token}`);
    }

    return { success: true };
  }

  async sendPasswordResetEmail(params: {
    to: string;
    username: string;
    token: string;
  }): Promise<{ success: boolean; error?: string }> {
    this.sentEmails.push({
      to: params.to,
      type: "reset",
      token: params.token,
      timestamp: new Date().toISOString(),
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(`[MockEmailProvider] Password reset email sent to ${params.to}`);
      console.log(`[MockEmailProvider] Token: ${params.token}`);
    }

    return { success: true };
  }

  /**
   * 테스트용: 발송된 이메일 목록 조회
   */
  getSentEmails() {
    return [...this.sentEmails];
  }

  /**
   * 테스트용: 최근 발송된 이메일 조회
   */
  getLastEmailFor(email: string) {
    return this.sentEmails.filter((e) => e.to === email).pop();
  }

  /**
   * 테스트용: 저장된 이메일 초기화
   */
  clearSentEmails() {
    this.sentEmails = [];
  }
}

/**
 * 전역 이메일 프로바이더 인스턴스
 */
let emailProvider: IEmailProvider | null = null;

export function getEmailProvider(): IEmailProvider {
  if (!emailProvider) {
    // 향후 .env 설정에 따라 다른 프로바이더 선택 가능
    emailProvider = new MockEmailProvider();
  }
  return emailProvider;
}

export function setEmailProvider(provider: IEmailProvider) {
  emailProvider = provider;
}

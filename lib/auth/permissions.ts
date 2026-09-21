export const ROLES = [
  "USER",
  "OPERATOR",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  // 회원
  "MEMBER_READ",
  "MEMBER_SUSPEND",

  // 신고
  "REPORT_READ",
  "REPORT_ACTION",

  // 방송
  "LIVE_READ",
  "LIVE_MODERATE",

  // 후원
  "DONATION_READ",
  "DONATION_MANUAL_RECOVERY",

  // 지갑 / 거래
  "WALLET_READ",

  // 정산
  "SETTLEMENT_READ",
  "SETTLEMENT_APPROVE",

  // 셀러
  "SELLER_READ",
  "SELLER_APPROVE",

  // 관리자 권한
  "ADMIN_PERMISSION_READ",
  "ADMIN_PERMISSION_MANAGE",

  // 관리자 감사 로그
  "AUDIT_LOG_READ",
] as const;

export type Permission =
  (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<
  Role,
  readonly Permission[]
> = {
  USER: [],

  OPERATOR: [
    "MEMBER_READ",
    "REPORT_READ",
    "LIVE_READ",
    "DONATION_READ",
  ],

  ADMIN: [
    "MEMBER_READ",
    "MEMBER_SUSPEND",
    "REPORT_READ",
    "REPORT_ACTION",
    "LIVE_READ",
    "LIVE_MODERATE",
    "DONATION_READ",
    "WALLET_READ",
    "SETTLEMENT_READ",
    "SELLER_READ",
    "SELLER_APPROVE",
    "ADMIN_PERMISSION_READ",
  ],

  SUPER_ADMIN: PERMISSIONS,
};

export function roleHasPermission(
  role: Role,
  permission: Permission,
) {
  return ROLE_PERMISSIONS[role].includes(
    permission as never,
  );
}

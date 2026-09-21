import type { Role } from "@/lib/auth/permissions";

export type AuditAction =
  | "DONATION_MANUAL_RECOVERY"
  | "MEMBER_SUSPEND"
  | "MEMBER_UNSUSPEND"
  | "LIVE_WARNING"
  | "LIVE_FORCE_END"
  | "REFUND"
  | "SETTLEMENT_ACTION"
  | "ADMIN_PERMISSION_CHANGE"
  | "SYSTEM_ACTION";

export type AuditResult =
  | "SUCCESS"
  | "FAILED";

export type AuditLogEntry = {
  auditId: string;

  adminUserId: string;
  adminRole: Role;

  action: AuditAction;

  targetType: string;
  targetId: string;

  reason?: string;

  result: AuditResult;

  metadata?: Record<string, unknown>;

  createdAt: string;
};

export type CreateAuditLogInput = Omit<
  AuditLogEntry,
  "auditId" | "createdAt"
>;

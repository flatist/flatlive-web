import fs from "fs/promises";
import path from "path";

import { MemberAdminService, type AdminMemberSummary } from "@/lib/admin/member-admin-service";
import type { Role } from "@/lib/auth/permissions";
import { roleHasPermission } from "@/lib/auth/permissions";
import type { LedgerTransaction } from "@/lib/wallet/types";
import type { AuditLogEntry } from "@/lib/audit/types";
import type { DonationTraceEvent } from "@/lib/donation/donation-trace";

type DonationDiagnostic = {
  donationId: string;
  status: "COMPLETED" | "FAILED_COMPENSATED" | "FAILED_REQUIRES_REVIEW" | "FAILED" | "PROCESSING";
  senderUserId: string | null;
  receiverUserId: string | null;
  amount: number | null;
  lastEventAt: string | null;
  errorMessages: string[];
  events: DonationTraceEvent[];
};

export type MemberDiagnosticResult = {
  query: string;
  member: AdminMemberSummary;
  generatedAt: string;
  summary: {
    level: "OK" | "WARN" | "ERROR";
    issueCount: number;
    warningCount: number;
    message: string;
  };
  permissions: {
    wallet: boolean;
    donation: boolean;
    audit: boolean;
  };
  wallet: {
    available: boolean;
    total: number;
    suspicious: number;
    transactions: LedgerTransaction[];
  };
  donations: {
    available: boolean;
    total: number;
    failed: number;
    requiresReview: number;
    items: DonationDiagnostic[];
  };
  audit: {
    available: boolean;
    total: number;
    failed: number;
    items: AuditLogEntry[];
  };
  login: {
    available: false;
    note: string;
  };
  live: {
    available: false;
    note: string;
  };
};

const DATA_DIR = path.join(process.cwd(), "data");

async function readJsonArray<T>(fileName: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, fileName), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function normalize(value: string | undefined | null) {
  return (value ?? "").trim().toLowerCase();
}

async function resolveMember(query: string) {
  const service = new MemberAdminService();
  const matches = await service.listMembers(query);
  const needle = normalize(query);

  const exact = matches.find((member) =>
    [member.id, member.username, member.email, member.displayName]
      .map(normalize)
      .includes(needle),
  );

  if (exact) return exact;
  if (matches.length === 1) return matches[0];

  if (matches.length === 0) {
    throw new Error("해당 아이디의 회원을 찾을 수 없습니다.");
  }

  throw new Error("검색 결과가 여러 명입니다. 아이디 또는 회원 ID를 정확히 입력해 주세요.");
}

function donationStatus(events: DonationTraceEvent[]): DonationDiagnostic["status"] {
  if (events.some((event) => event.eventType === "COMPLETED")) return "COMPLETED";
  if (events.some((event) => event.eventType === "COMPENSATION_FAILED")) return "FAILED_REQUIRES_REVIEW";
  if (
    events.some((event) => event.eventType === "FAILED") &&
    events.some((event) => event.eventType === "COMPENSATION_COMPLETED")
  ) {
    return "FAILED_COMPENSATED";
  }
  if (events.some((event) => event.eventType === "FAILED")) return "FAILED";
  return "PROCESSING";
}

function buildDonationDiagnostics(events: DonationTraceEvent[], userId: string): DonationDiagnostic[] {
  const relevant = events.filter(
    (event) => event.senderUserId === userId || event.receiverUserId === userId,
  );

  const grouped = new Map<string, DonationTraceEvent[]>();
  for (const event of relevant) {
    const list = grouped.get(event.donationId) ?? [];
    list.push(event);
    grouped.set(event.donationId, list);
  }

  return Array.from(grouped.entries())
    .map(([donationId, list]) => {
      const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const started = sorted.find((event) => event.eventType === "DONATION_STARTED");
      return {
        donationId,
        status: donationStatus(sorted),
        senderUserId: started?.senderUserId ?? sorted[0]?.senderUserId ?? null,
        receiverUserId: started?.receiverUserId ?? sorted[0]?.receiverUserId ?? null,
        amount: started?.amount ?? sorted.find((event) => typeof event.amount === "number")?.amount ?? null,
        lastEventAt: sorted.at(-1)?.createdAt ?? null,
        errorMessages: sorted
          .map((event) => event.errorMessage)
          .filter((message): message is string => Boolean(message)),
        events: sorted,
      };
    })
    .sort((a, b) => (b.lastEventAt ?? "").localeCompare(a.lastEventAt ?? ""));
}

function auditMatchesUser(log: AuditLogEntry, userId: string) {
  if (log.targetId === userId || log.adminUserId === userId) return true;
  try {
    return JSON.stringify(log.metadata ?? {}).includes(userId);
  } catch {
    return false;
  }
}

export async function diagnoseMember(input: {
  query: string;
  adminRole: Role;
}): Promise<MemberDiagnosticResult> {
  const query = input.query.trim();
  if (!query) throw new Error("회원 아이디를 입력해 주세요.");

  const member = await resolveMember(query);
  const walletAllowed = roleHasPermission(input.adminRole, "WALLET_READ");
  const donationAllowed = roleHasPermission(input.adminRole, "DONATION_READ");
  const auditAllowed = roleHasPermission(input.adminRole, "AUDIT_LOG_READ");

  const walletTransactions = walletAllowed
    ? (await readJsonArray<LedgerTransaction>("wallet-ledger.json"))
        .filter((item) => item.ownerId === member.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 200)
    : [];

  const suspiciousWallet = walletTransactions.filter(
    (item) => item.status === "HOLD" || item.status === "REVERSED" || item.status === "CANCELLED",
  );

  const donationItems = donationAllowed
    ? buildDonationDiagnostics(
        await readJsonArray<DonationTraceEvent>("donation-events.json"),
        member.id,
      ).slice(0, 100)
    : [];

  const donationFailed = donationItems.filter(
    (item) => item.status === "FAILED" || item.status === "FAILED_COMPENSATED" || item.status === "FAILED_REQUIRES_REVIEW",
  );
  const donationReview = donationItems.filter((item) => item.status === "FAILED_REQUIRES_REVIEW");

  const auditItems = auditAllowed
    ? (await readJsonArray<AuditLogEntry>("admin-audit-log.json"))
        .filter((log) => auditMatchesUser(log, member.id))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 100)
    : [];
  const failedAudit = auditItems.filter((item) => item.result === "FAILED");

  const issueCount = suspiciousWallet.length + donationFailed.length + failedAudit.length;
  const warningCount = donationReview.length + walletTransactions.filter((item) => item.status === "PENDING").length;

  const level: MemberDiagnosticResult["summary"]["level"] =
    donationReview.length > 0 || failedAudit.length > 0 ? "ERROR" : issueCount > 0 || warningCount > 0 ? "WARN" : "OK";

  return {
    query,
    member,
    generatedAt: new Date().toISOString(),
    summary: {
      level,
      issueCount,
      warningCount,
      message:
        level === "ERROR"
          ? "확인이 필요한 실패 또는 수동 검토 항목이 있습니다."
          : level === "WARN"
            ? "실패/취소/대기 이력이 있어 확인이 필요합니다."
            : "현재 저장된 진단 데이터에서 특이 오류가 발견되지 않았습니다.",
    },
    permissions: {
      wallet: walletAllowed,
      donation: donationAllowed,
      audit: auditAllowed,
    },
    wallet: {
      available: walletAllowed,
      total: walletTransactions.length,
      suspicious: suspiciousWallet.length,
      transactions: walletTransactions,
    },
    donations: {
      available: donationAllowed,
      total: donationItems.length,
      failed: donationFailed.length,
      requiresReview: donationReview.length,
      items: donationItems,
    },
    audit: {
      available: auditAllowed,
      total: auditItems.length,
      failed: failedAudit.length,
      items: auditItems,
    },
    login: {
      available: false,
      note: "현재 프로젝트에는 회원별 로그인 실패 이력을 영구 저장하는 전용 로그가 없어 자동 진단 대상에 포함되지 않습니다.",
    },
    live: {
      available: false,
      note: "현재 프로젝트에는 회원별 LIVE 연결/재연결 오류를 영구 저장하는 전용 오류 로그가 없어 자동 진단 대상에 포함되지 않습니다.",
    },
  };
}

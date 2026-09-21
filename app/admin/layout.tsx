import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import AdminShell from "./AdminShell";
import {
  AuthenticationError,
  AuthorizationError,
  requireAuthenticatedUser,
} from "@/lib/auth/authorization";
import { roleHasPermission, type Permission } from "@/lib/auth/permissions";

type MenuItem = {
  href: string;
  label: string;
  code: string;
  group: string;
  permission: Permission;
};

const MENUS: MenuItem[] = [
  { href: "/admin/members", label: "회원 관리", code: "MB", group: "회원 · 운영", permission: "MEMBER_READ" },
  { href: "/admin/support", label: "고객 문의", code: "CS", group: "회원 · 운영", permission: "MEMBER_READ" },
  { href: "/admin/notices", label: "공지 관리", code: "NT", group: "회원 · 운영", permission: "MEMBER_READ" },
  { href: "/admin/reports", label: "신고 관리", code: "RP", group: "회원 · 운영", permission: "REPORT_READ" },
  { href: "/admin/content", label: "콘텐츠 관리", code: "CT", group: "회원 · 운영", permission: "REPORT_READ" },

  { href: "/admin/live", label: "LIVE 관제", code: "LV", group: "LIVE", permission: "LIVE_READ" },
  { href: "/admin/donations", label: "후원 거래", code: "DN", group: "LIVE", permission: "DONATION_READ" },
  { href: "/admin/donation-effects", label: "후원 효과", code: "FX", group: "LIVE", permission: "DONATION_READ" },

  { href: "/admin/wallet", label: "지갑 · 거래", code: "WL", group: "수익 · 정산", permission: "WALLET_READ" },
  { href: "/admin/settlements", label: "정산 관리", code: "ST", group: "수익 · 정산", permission: "SETTLEMENT_READ" },
  { href: "/admin/agencies", label: "조직 통합 현황", code: "OR", group: "에이전시 조직", permission: "SETTLEMENT_READ" },
  { href: "/admin/agencies/head", label: "본부장 관리", code: "HQ", group: "에이전시 조직", permission: "SETTLEMENT_READ" },
  { href: "/admin/agencies/branch", label: "지사장 관리", code: "BR", group: "에이전시 조직", permission: "SETTLEMENT_READ" },
  { href: "/admin/agencies/agency", label: "에이전시 관리", code: "AG", group: "에이전시 조직", permission: "SETTLEMENT_READ" },
  { href: "/admin/agencies/access-codes", label: "조직 접속코드", code: "KY", group: "에이전시 조직", permission: "ADMIN_PERMISSION_MANAGE" },
  { href: "/admin/fit", label: "FIT 설정", code: "FT", group: "수익 · 정산", permission: "WALLET_READ" },

  { href: "/admin/lounge", label: "라운지 관리", code: "LG", group: "서비스", permission: "MEMBER_READ" },

  { href: "/admin/permissions", label: "관리자 권한", code: "PM", group: "시스템", permission: "ADMIN_PERMISSION_READ" },
  { href: "/admin/audit", label: "감사 로그", code: "AL", group: "시스템", permission: "AUDIT_LOG_READ" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    const admin = await requireAuthenticatedUser();
    const visibleMenus = MENUS.filter((menu) => roleHasPermission(admin.role, menu.permission));

    if (visibleMenus.length === 0) {
      redirect("/");
    }

    return (
      <AdminShell
        role={admin.role}
        menus={visibleMenus.map(({ permission: _permission, ...menu }) => menu)}
      >
        {children}
      </AdminShell>
    );
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      redirect("/");
    }
    throw error;
  }
}

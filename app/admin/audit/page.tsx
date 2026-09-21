import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";

import { LocalAuditLogRepository } from "@/lib/audit/local-audit-log-repository";

export default async function AdminAuditPage() {
  try {
    await requirePermission("AUDIT_LOG_READ");

    const repository = new LocalAuditLogRepository();
    const logs = await repository.list(200);

    return (
      <main
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "40px 24px 80px",
        }}
      >
        <Link
          href="/admin"
          style={{
            color: "#555",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← 관리자 대시보드
        </Link>

        <header style={{ margin: "24px 0 30px" }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#666",
              marginBottom: 8,
            }}
          >
            FLATLIVE ADMIN
          </div>

          <h1 style={{ margin: 0, fontSize: 32 }}>
            관리자 감사 로그
          </h1>

          <p style={{ color: "#666", lineHeight: 1.6 }}>
            관리자 중요 작업의 처리자, 대상, 사유와 결과를
            확인합니다. 감사 기록은 이 화면에서 수정하거나
            삭제할 수 없습니다.
          </p>
        </header>

        <div
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 16,
            overflowX: "auto",
            background: "#fff",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1100,
            }}
          >
            <thead>
              <tr style={{ background: "#f7f7f7" }}>
                {[
                  "처리시간",
                  "관리자 역할",
                  "작업",
                  "대상",
                  "사유",
                  "결과",
                  "금액",
                ].map((title) => (
                  <th
                    key={title}
                    style={{
                      padding: 14,
                      textAlign: "left",
                      borderBottom: "1px solid #ddd",
                      fontSize: 14,
                    }}
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "#777",
                    }}
                  >
                    저장된 감사 로그가 없습니다.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const amount =
                    typeof log.metadata?.amount === "number"
                      ? log.metadata.amount
                      : null;

                  return (
                    <tr key={log.auditId}>
                      <td
                        style={{
                          padding: 14,
                          borderBottom: "1px solid #eee",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(log.createdAt).toLocaleString(
                          "ko-KR",
                          { timeZone: "Asia/Seoul" },
                        )}
                      </td>

                      <td
                        style={{
                          padding: 14,
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        {log.adminRole}
                      </td>

                      <td
                        style={{
                          padding: 14,
                          borderBottom: "1px solid #eee",
                          fontWeight: 700,
                        }}
                      >
                        {log.action}
                      </td>

                      <td
                        style={{
                          padding: 14,
                          borderBottom: "1px solid #eee",
                          wordBreak: "break-all",
                        }}
                      >
                        <div>{log.targetType}</div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: "#666",
                          }}
                        >
                          {log.targetId}
                        </div>
                      </td>

                      <td
                        style={{
                          padding: 14,
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        {log.reason || "-"}
                      </td>

                      <td
                        style={{
                          padding: 14,
                          borderBottom: "1px solid #eee",
                          fontWeight: 800,
                        }}
                      >
                        {log.result === "SUCCESS"
                          ? "성공"
                          : "실패"}
                      </td>

                      <td
                        style={{
                          padding: 14,
                          borderBottom: "1px solid #eee",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {amount !== null
                          ? `${amount.toLocaleString()} FLAT`
                          : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p
          style={{
            marginTop: 14,
            color: "#777",
            fontSize: 13,
          }}
        >
          최근 {logs.length}건 표시
        </p>
      </main>
    );
  } catch (error) {
    if (
      error instanceof AuthenticationError ||
      error instanceof AuthorizationError
    ) {
      redirect("/");
    }

    throw error;
  }
}

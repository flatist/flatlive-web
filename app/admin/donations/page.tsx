"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type TraceEvent = {
  eventType: string;
  createdAt?: string;
  senderUserId?: string;
  receiverUserId?: string;
  amount?: number;
  [key: string]: unknown;
};

type TraceResult = {
  donationId: string;
  senderUserId: string | null;
  receiverUserId: string | null;
  amount: number | null;
  donationMode:
    | "single"
    | "repeat"
    | "sequence";
  status:
    | "COMPLETED"
    | "FAILED_COMPENSATED"
    | "FAILED_REQUIRES_REVIEW"
    | "FAILED"
    | "PROCESSING";
  requiresManualReview: boolean;
  events: TraceEvent[];
};

const STATUS_LABEL: Record<TraceResult["status"], string> = {
  COMPLETED: "정상 완료",
  FAILED_COMPENSATED: "실패 · 자동복구 완료",
  FAILED_REQUIRES_REVIEW: "복구 실패 · 관리자 확인 필요",
  FAILED: "후원 실패",
  PROCESSING: "처리 중",
};

export default function AdminDonationsPage() {
  const [donationId, setDonationId] = useState("");
  const [result, setResult] = useState<TraceResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [recoveryReason, setRecoveryReason] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");

  async function searchDonation(id: string) {
    const response = await fetch(
      `/api/admin/donations/trace?donationId=${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "후원 기록을 조회하지 못했습니다.",
      );
    }

    setResult(data);
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();

    const id = donationId.trim();

    if (!id) {
      setError("후원 ID를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setRecoveryReason("");
    setRecoveryMessage("");

    try {
      await searchDonation(id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "후원 기록을 조회하지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleManualRecovery() {
    if (!result) {
      return;
    }

    const reason = recoveryReason.trim();

    if (!reason) {
      setRecoveryMessage("수동복구 사유를 입력해주세요.");
      return;
    }

    const confirmed = window.confirm(
      `${result.amount?.toLocaleString() ?? "-"} FLAT을 ` +
        `${result.senderUserId ?? "발신자"}에게 수동복구하시겠습니까?\n\n` +
        "이 작업은 거래 기록으로 남습니다.",
    );

    if (!confirmed) {
      return;
    }

    setRecovering(true);
    setRecoveryMessage("");

    try {
      const response = await fetch(
        "/api/admin/donations/manual-recovery",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            donationId: result.donationId,
            reason,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "수동복구에 실패했습니다.",
        );
      }

      setRecoveryMessage(
        `${data.result.amount.toLocaleString()} FLAT 수동복구가 완료되었습니다.`,
      );

      setRecoveryReason("");

      await searchDonation(result.donationId);
    } catch (err) {
      setRecoveryMessage(
        err instanceof Error
          ? err.message
          : "수동복구에 실패했습니다.",
      );
    } finally {
      setRecovering(false);
    }
  }

  const manualRecoveryCompleted =
    result?.events.some(
      (event) =>
        event.eventType === "MANUAL_RECOVERY_COMPLETED",
    ) ?? false;

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "40px 24px 80px",
      }}
    >
      <Link
        href="/admin"
        style={{
          color: "#666",
          textDecoration: "none",
          fontSize: 14,
        }}
      >
        ← 관리자 대시보드
      </Link>

      <div style={{ marginTop: 24, marginBottom: 30 }}>
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
          후원 · 거래 추적
        </h1>

        <p style={{ color: "#666" }}>
          후원 ID를 입력하면 거래 처리 과정을 추적합니다.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 28,
        }}
      >
        <input
          value={donationId}
          onChange={(event) =>
            setDonationId(event.target.value)
          }
          placeholder="donationId 입력"
          style={{
            flex: 1,
            padding: "14px 16px",
            border: "1px solid #ddd",
            borderRadius: 10,
            fontSize: 15,
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            border: 0,
            borderRadius: 10,
            padding: "0 24px",
            background: "#111",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {loading ? "조회 중" : "조회"}
        </button>
      </form>

      {error && (
        <div
          style={{
            padding: 18,
            borderRadius: 12,
            background: "#fff1f1",
            color: "#b00020",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <>
          <section
            style={{
              border: result.requiresManualReview
                ? "2px solid #b00020"
                : "1px solid #e5e5e5",
              borderRadius: 16,
              padding: 22,
              marginBottom: 22,
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              {manualRecoveryCompleted
                ? "수동복구 완료"
                : STATUS_LABEL[result.status]}
            </h2>

            {result.requiresManualReview &&
              !manualRecoveryCompleted && (
                <p
                  style={{
                    fontWeight: 800,
                    color: "#b00020",
                  }}
                >
                  ⚠ 자동복구에 실패했습니다. 관리자가 직접 확인해야 합니다.
                </p>
              )}

            <div style={{ lineHeight: 1.9 }}>
              <div>후원 ID: {result.donationId}</div>
              <div>
                보낸 회원 ID: {result.senderUserId ?? "-"}
              </div>
              <div>
                받은 회원 ID: {result.receiverUserId ?? "-"}
              </div>
              <div>
                금액:{" "}
                {result.amount === null
                  ? "-"
                  : `${result.amount.toLocaleString()} FLAT`}
              </div>

              <div>
                선물 방식:{" "}
                {result.donationMode === "repeat"
                  ? "반복 선물"
                  : result.donationMode === "sequence"
                    ? "순차 선물"
                    : "일반 선물"}
              </div>
            </div>
          </section>

          {result.status === "FAILED_REQUIRES_REVIEW" &&
            !manualRecoveryCompleted && (
              <section
                style={{
                  padding: 22,
                  border: "2px solid #b00020",
                  borderRadius: 16,
                  marginBottom: 26,
                  background: "#fffafa",
                }}
              >
                <h2 style={{ marginTop: 0 }}>
                  수동복구
                </h2>

                <p
                  style={{
                    color: "#666",
                    lineHeight: 1.6,
                  }}
                >
                  거래 기록을 확인한 후 실제 복구가 필요한 경우에만 실행하세요.
                  수동복구 기록과 처리 관리자 정보가 저장됩니다.
                </p>

                <textarea
                  value={recoveryReason}
                  onChange={(event) =>
                    setRecoveryReason(event.target.value)
                  }
                  placeholder="수동복구 사유를 입력하세요."
                  rows={4}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 14,
                    border: "1px solid #ccc",
                    borderRadius: 10,
                    fontSize: 14,
                    resize: "vertical",
                    marginTop: 8,
                  }}
                />

                <button
                  type="button"
                  disabled={
                    recovering ||
                    recoveryReason.trim().length === 0
                  }
                  onClick={handleManualRecovery}
                  style={{
                    marginTop: 12,
                    border: 0,
                    borderRadius: 10,
                    padding: "14px 20px",
                    background:
                      recovering ||
                      recoveryReason.trim().length === 0
                        ? "#aaa"
                        : "#b00020",
                    color: "#fff",
                    fontWeight: 800,
                    cursor:
                      recovering ||
                      recoveryReason.trim().length === 0
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {recovering
                    ? "복구 처리 중..."
                    : "수동복구 실행"}
                </button>
              </section>
            )}

          {recoveryMessage && (
            <div
              style={{
                padding: 16,
                border: "1px solid #ddd",
                borderRadius: 12,
                marginBottom: 24,
                fontWeight: 700,
              }}
            >
              {recoveryMessage}
            </div>
          )}

          <section>
            <h2>처리 기록</h2>

            <div
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {result.events.map((event, index) => (
                <div
                  key={`${event.eventType}-${index}`}
                  style={{
                    padding: 16,
                    borderTop:
                      index === 0
                        ? "none"
                        : "1px solid #eee",
                  }}
                >
                  <strong>{event.eventType}</strong>

                  {event.createdAt && (
                    <div
                      style={{
                        marginTop: 5,
                        color: "#666",
                        fontSize: 13,
                      }}
                    >
                      {new Date(
                        event.createdAt,
                      ).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

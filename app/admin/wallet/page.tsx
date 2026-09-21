"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type SearchField =
  | "ALL"
  | "OWNER_ID"
  | "TRANSACTION_ID"
  | "SOURCE_ID"
  | "WALLET_ID";

type LedgerTransaction = {
  transactionId: string;
  walletId: string;
  legalEntity: string;
  ownerType: string;
  ownerId: string;
  assetType: string;
  amount: number;
  direction: "CREDIT" | "DEBIT";
  balanceBefore: number;
  balanceAfter: number;
  sourceType: string;
  sourceId: string;
  status: string;
  reversedTransactionId?: string;
  createdAt: string;
};

type SearchResult = {
  query: string;
  field: SearchField;
  totalMatched: number;
  returned: number;
  transactions: LedgerTransaction[];
};

const FIELD_LABELS: Record<SearchField, string> = {
  ALL: "전체",
  OWNER_ID: "회원 ID",
  TRANSACTION_ID: "거래 ID",
  SOURCE_ID: "후원/원본 ID",
  WALLET_ID: "지갑 ID",
};

export default function AdminWalletPage() {
  const [query, setQuery] = useState("");
  const [field, setField] = useState<SearchField>("ALL");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function searchLedger(event?: FormEvent) {
    event?.preventDefault();

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        field,
        limit: "100",
      });

      const response = await fetch(
        `/api/admin/wallet/ledger?${params.toString()}`,
        { cache: "no-store" },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "거래 장부를 조회하지 못했습니다.",
        );
      }

      setResult(data);
    } catch (err) {
      setResult(null);
      setError(
        err instanceof Error
          ? err.message
          : "거래 장부를 조회하지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 1280,
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
          지갑 · 거래 장부
        </h1>

        <p style={{ color: "#666", lineHeight: 1.6 }}>
          회원의 FLAT 등 지갑 거래 내역을 조회합니다.
          이 화면에서는 장부를 수정할 수 없습니다.
        </p>
      </div>

      <form
        onSubmit={searchLedger}
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <select
          value={field}
          onChange={(event) =>
            setField(event.target.value as SearchField)
          }
          style={{
            padding: "13px 14px",
            border: "1px solid #ddd",
            borderRadius: 10,
            background: "#fff",
            fontSize: 14,
          }}
        >
          {Object.entries(FIELD_LABELS).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="회원 ID, 거래 ID, 후원 ID 등을 입력"
          style={{
            flex: "1 1 420px",
            padding: "13px 16px",
            border: "1px solid #ddd",
            borderRadius: 10,
            fontSize: 14,
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0 24px",
            minHeight: 46,
            border: 0,
            borderRadius: 10,
            background: loading ? "#777" : "#111",
            color: "#fff",
            fontWeight: 800,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "조회 중..." : "조회"}
        </button>
      </form>

      {error && (
        <div
          style={{
            padding: 16,
            marginBottom: 22,
            borderRadius: 12,
            background: "#fff1f1",
            color: "#b00020",
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <>
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 18,
              color: "#555",
              fontSize: 14,
            }}
          >
            <span>
              검색 결과 <strong>{result.totalMatched}</strong>건
            </span>

            <span>
              화면 표시 <strong>{result.returned}</strong>건
            </span>
          </div>

          {result.transactions.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                border: "1px solid #e5e5e5",
                borderRadius: 14,
                color: "#777",
              }}
            >
              검색된 거래가 없습니다.
            </div>
          ) : (
            <div
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: 14,
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 1150,
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ background: "#f7f7f7" }}>
                    {[
                      "시간",
                      "회원 ID",
                      "구분",
                      "자산",
                      "금액",
                      "이전 잔액",
                      "이후 잔액",
                      "거래 유형",
                      "거래 ID",
                      "원본 ID",
                      "상태",
                    ].map((title) => (
                      <th
                        key={title}
                        style={{
                          padding: "13px 12px",
                          textAlign: "left",
                          whiteSpace: "nowrap",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {result.transactions.map((tx) => (
                    <tr key={tx.transactionId}>
                      <td
                        style={{
                          padding: 12,
                          borderBottom: "1px solid #eee",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>

                      <td style={cellStyle}>{tx.ownerId}</td>

                      <td style={cellStyle}>
                        <strong>
                          {tx.direction === "CREDIT"
                            ? "입금"
                            : "차감"}
                        </strong>
                      </td>

                      <td style={cellStyle}>{tx.assetType}</td>

                      <td style={cellStyle}>
                        <strong>
                          {tx.direction === "CREDIT" ? "+" : "-"}
                          {tx.amount.toLocaleString()}
                        </strong>
                      </td>

                      <td style={cellStyle}>
                        {tx.balanceBefore.toLocaleString()}
                      </td>

                      <td style={cellStyle}>
                        {tx.balanceAfter.toLocaleString()}
                      </td>

                      <td style={cellStyle}>{tx.sourceType}</td>

                      <td style={idCellStyle}>
                        {tx.transactionId}
                      </td>

                      <td style={idCellStyle}>{tx.sourceId}</td>

                      <td style={cellStyle}>{tx.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}

const cellStyle = {
  padding: 12,
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
} as const;

const idCellStyle = {
  ...cellStyle,
  fontFamily: "monospace",
  fontSize: 12,
} as const;

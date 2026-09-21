"use client";

import { FormEvent, useEffect, useState } from "react";

type Member = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export default function AdminMembersPage() {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMembers(search = "") {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/members?q=${encodeURIComponent(search)}`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "회원 정보를 불러오지 못했습니다.",
        );
      }

      setMembers(data.members ?? []);
    } catch (err) {
      setMembers([]);
      setError(
        err instanceof Error
          ? err.message
          : "회원 정보를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    loadMembers(query);
  }

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "40px 24px 80px",
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#666",
            marginBottom: 8,
          }}
        >
          FLATLIVE ADMIN
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 800,
          }}
        >
          회원 관리
        </h1>

        <p
          style={{
            color: "#666",
            marginTop: 10,
          }}
        >
          아이디, 이메일, 닉네임, 사용자 ID로 회원을 검색할 수 있습니다.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 28,
        }}
      >
        <input
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="회원 검색"
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
          검색
        </button>
      </form>

      {loading && (
        <p>회원 정보를 불러오는 중입니다.</p>
      )}

      {error && (
        <div
          style={{
            padding: 16,
            background: "#fff1f1",
            borderRadius: 10,
            color: "#b00020",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <div
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              background: "#fafafa",
              fontWeight: 700,
            }}
          >
            검색 결과 {members.length}명
          </div>

          {members.length === 0 ? (
            <div style={{ padding: 24 }}>
              검색 결과가 없습니다.
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                style={{
                  padding: 18,
                  borderTop: "1px solid #eee",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 20,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong>
                      {member.displayName}
                    </strong>

                    <div
                      style={{
                        marginTop: 5,
                        color: "#555",
                      }}
                    >
                      @{member.username}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {member.role}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gap: 6,
                    fontSize: 14,
                    color: "#555",
                  }}
                >
                  <div>이메일: {member.email}</div>
                  <div>회원 ID: {member.id}</div>
                  <div>
                    가입일:{" "}
                    {new Date(
                      member.createdAt,
                    ).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}

"use client";

import { useState } from "react";

export function FollowButton({ targetUserId, initialFollowing }: { targetUserId: string; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError("");

    const response = await fetch("/api/social/follow", {
      method: following ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!response.ok) {
      setError(data.error || "처리에 실패했습니다.");
      return;
    }
    setFollowing(Boolean(data.following));
    window.location.reload();
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`rounded-full px-5 py-2 text-sm font-black disabled:opacity-50 ${following ? "border border-white/15 bg-transparent text-white" : "bg-white text-black"}`}
      >
        {busy ? "처리 중..." : following ? "팔로잉" : "팔로우"}
      </button>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function ProfileEditPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(async (res) => {
      if (res.status === 401) return router.replace("/login");
      const data = await res.json();
      if (data.profile) {
        setNickname(data.profile.nickname ?? "");
        setBio(data.profile.bio ?? "");
        setAvatarUrl(data.profile.avatarUrl ?? "");
        setIsPublic(data.profile.isPublic !== false);
      }
    });
  }, [router]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("");
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setMessage("JPG, PNG, WEBP 이미지만 사용할 수 있습니다.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setMessage("프로필 이미지는 5MB 이하만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadAvatar() {
    if (!avatarFile) return avatarUrl;

    const formData = new FormData();
    formData.append("avatar", avatarFile);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "프로필 이미지 업로드에 실패했습니다.");
    return data.avatarUrl as string;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const nextAvatarUrl = await uploadAvatar();
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, bio, avatarUrl: nextAvatarUrl, isPublic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장에 실패했습니다.");

      router.push("/profile");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const visibleAvatar = previewUrl || avatarUrl;

  return (
    <main className="min-h-screen bg-black px-4 pb-24 pt-8 text-white md:px-6 md:pt-24">
      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-8">
        <div>
          <p className="text-xs font-bold text-zinc-500">FLAT LIVE</p>
          <h1 className="mt-1 text-3xl font-black">프로필 편집</h1>
          <p className="mt-2 text-sm text-zinc-500">이 정보는 통합계정이 아닌 FlatLive 서비스 프로필에만 저장됩니다.</p>
        </div>

        <section className="flex items-center gap-5 rounded-2xl border border-white/10 p-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-zinc-800">
            {visibleAvatar ? <img src={visibleAvatar} alt="프로필 미리보기" className="h-full w-full object-cover" /> : null}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={selectAvatar}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white hover:text-black"
            >
              사진 선택
            </button>
            <p className="mt-2 text-xs text-zinc-500">JPG · PNG · WEBP / 최대 5MB</p>
          </div>
        </section>

        <label className="block">
          <span className="text-sm font-bold">방송 닉네임</span>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={30}
            required
            className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/30"
            placeholder="2~30자"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold">자기소개</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={4}
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-white/30"
            placeholder="나를 소개해주세요."
          />
          <span className="mt-1 block text-right text-xs text-zinc-600">{bio.length}/160</span>
        </label>

        <label className="flex items-center justify-between rounded-xl border border-white/10 p-4">
          <span>
            <b className="block text-sm">프로필 공개</b>
            <small className="text-zinc-500">다른 사용자가 프로필을 볼 수 있도록 합니다.</small>
          </span>
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-5 w-5" />
        </label>

        {message && <p className="text-sm text-red-400">{message}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="flex-1 rounded-xl border border-white/10 py-3 font-bold">
            취소
          </button>
          <button disabled={saving} className="flex-1 rounded-xl bg-white py-3 font-black text-black disabled:opacity-50">
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </main>
  );
}

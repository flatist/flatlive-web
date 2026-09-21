"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { ensureCreatorConsent } from "@/lib/creator/ensure-creator-consent";

export default function VodUploadPage() {
  const router = useRouter();

  const [video, setVideo] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  const [videoPreviewUrl, setVideoPreviewUrl] =
    useState("");

  const [
    thumbnailPreviewUrl,
    setThumbnailPreviewUrl,
  ] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [isAdult, setIsAdult] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [traceId, setTraceId] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!video) {
      setMessage("영상 파일을 선택해주세요.");
      return;
    }

    if (!thumbnail) {
      setMessage("VOD 썸네일 이미지를 선택해주세요.");
      return;
    }

    if (!title.trim()) {
      setMessage("제목을 입력해주세요.");
      return;
    }

    const creatorConsentGranted =
      await ensureCreatorConsent();

    if (!creatorConsentGranted) {
      return;
    }

    setUploading(true);
    setMessage("");
    setTraceId("");

    try {
      const formData = new FormData();

      formData.append("video", video);
      formData.append("thumbnail", thumbnail);
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("visibility", visibility);
      formData.append(
        "isAdult",
        isAdult ? "true" : "false",
      );

      const response = await fetch("/api/vod", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(
          result.error || "VOD 업로드에 실패했습니다.",
        );

        if (result.traceId) {
          setTraceId(result.traceId);
        }

        return;
      }

      setMessage("VOD 업로드가 완료되었습니다.");

      if (result.traceId) {
        setTraceId(result.traceId);
      }

      setTimeout(() => {
        router.push(`/vod/${result.vod.id}`);
      }, 800);
    } catch {
      setMessage("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#090909] pb-24 pt-24 text-white md:pt-28">
      <div className="mx-auto max-w-5xl px-5 md:px-6">
        <div className="mb-8">
          <p className="text-xs font-black text-flat-yellow">
            CREATOR STUDIO
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            VOD 올리기
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            가로형 일반 영상을 업로드하세요.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]"
        >
          <section className="rounded-[24px] border border-white/[0.08] bg-[#111] p-5">
            <h2 className="text-lg font-black">
              영상 파일
            </h2>

            <label className="mt-5 flex aspect-video cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed border-white/[0.15] bg-black/20 text-center transition hover:border-flat-yellow/50">
              <span className="text-3xl">▭</span>

              <strong className="mt-3 text-sm">
                VOD 영상 선택
              </strong>

              <span className="mt-2 text-xs text-zinc-500">
                MP4 · MOV · WEBM · M4V
              </span>

              <span className="mt-1 text-xs text-zinc-600">
                현재 테스트 최대 500MB
              </span>

              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => {
                  const file =
                    event.target.files?.[0] || null;

                  if (videoPreviewUrl) {
                    URL.revokeObjectURL(
                      videoPreviewUrl,
                    );
                  }

                  setVideo(file);

                  setVideoPreviewUrl(
                    file
                      ? URL.createObjectURL(file)
                      : "",
                  );
                }}
              />
            </label>

            {video && videoPreviewUrl && (
              <div className="mt-4 overflow-hidden rounded-[20px] border border-white/[0.08] bg-black">
                <video
                  src={videoPreviewUrl}
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full object-contain"
                />

                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0 truncate text-xs text-zinc-400">
                    {video.name}
                  </span>

                  <span className="shrink-0 text-[10px] font-black text-flat-yellow">
                    선택한 영상
                  </span>
                </div>
              </div>
            )}


            <div className="mt-7 border-t border-white/[0.08] pt-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black">
                    VOD 썸네일
                  </h3>

                  <p className="mt-1 text-xs text-zinc-500">
                    목록과 홈에서 보여질 대표 이미지입니다.
                  </p>
                </div>

                <span className="text-[10px] font-bold text-flat-yellow">
                  필수
                </span>
              </div>

              <label className="mt-4 flex aspect-video cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[20px] border border-dashed border-white/[0.15] bg-black/30 text-center transition hover:border-flat-yellow/50">
                <span className="text-3xl">
                  ▧
                </span>

                <strong className="mt-3 text-sm">
                  썸네일 이미지 선택
                </strong>

                <span className="mt-2 text-xs text-zinc-500">
                  JPG · PNG · WEBP
                </span>

                <span className="mt-1 text-xs text-zinc-600">
                  권장 1280 × 720 · 최대 5MB
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file =
                      event.target.files?.[0] || null;

                    if (thumbnailPreviewUrl) {
                      URL.revokeObjectURL(
                        thumbnailPreviewUrl,
                      );
                    }

                    setThumbnail(file);

                    setThumbnailPreviewUrl(
                      file
                        ? URL.createObjectURL(file)
                        : "",
                    );
                  }}
                />
              </label>

              {thumbnail &&
                thumbnailPreviewUrl && (
                  <div className="mt-4 overflow-hidden rounded-[20px] border border-white/[0.08] bg-black">
                    <img
                      src={thumbnailPreviewUrl}
                      alt="선택한 VOD 썸네일"
                      className="aspect-video w-full object-cover"
                    />

                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="min-w-0 truncate text-xs text-zinc-400">
                        {thumbnail.name}
                      </span>

                      <span className="shrink-0 text-[10px] font-black text-flat-yellow">
                        선택한 썸네일
                      </span>
                    </div>
                  </div>
                )}
            </div>
          </section>

          <section className="rounded-[24px] border border-white/[0.08] bg-[#111] p-5">
            <h2 className="text-lg font-black">
              VOD 정보
            </h2>

            <div className="mt-5 space-y-5">
              <label className="block">
                <span className="text-sm font-bold">
                  제목
                </span>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="VOD 제목을 입력하세요"
                  className="mt-2 h-12 w-full rounded-xl border border-white/[0.08] bg-black/30 px-4 text-sm outline-none focus:border-flat-yellow/60"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold">
                  설명
                </span>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="영상 설명을 입력하세요"
                  rows={6}
                  className="mt-2 w-full resize-none rounded-xl border border-white/[0.08] bg-black/30 p-4 text-sm outline-none focus:border-flat-yellow/60"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold">
                  공개 설정
                </span>

                <select
                  value={visibility}
                  onChange={(event) =>
                    setVisibility(event.target.value)
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-white/[0.08] bg-[#151515] px-4 text-sm outline-none"
                >
                  <option value="public">
                    전체 공개
                  </option>

                  <option value="followers">
                    팔로워 공개
                  </option>

                  <option value="private">
                    비공개
                  </option>
                </select>
              </label>

              <div>
                <span className="text-sm font-bold">
                  연령 설정
                </span>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setIsAdult(false)
                    }
                    className={
                      !isAdult
                        ? "rounded-xl border border-flat-yellow bg-flat-yellow px-4 py-3 text-sm font-black text-black"
                        : "rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm font-bold text-zinc-400"
                    }
                  >
                    전체 이용
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setIsAdult(true)
                    }
                    className={
                      isAdult
                        ? "rounded-xl border border-red-500 bg-red-600 px-4 py-3 text-sm font-black text-white"
                        : "rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm font-bold text-zinc-400"
                    }
                  >
                    🔞 19세 이상
                  </button>
                </div>

                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  성인 대상 콘텐츠라면 반드시 19세 이상으로 설정해주세요.
                </p>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="flex h-13 w-full items-center justify-center rounded-xl bg-flat-yellow px-5 py-3.5 text-sm font-black text-black disabled:opacity-50"
              >
                {uploading
                  ? "업로드 중..."
                  : "VOD 업로드"}
              </button>

              {message && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 text-sm text-zinc-300">
                  <p>{message}</p>

                  {traceId && (
                    <p className="mt-2 break-all text-[11px] text-zinc-600">
                      Trace ID: {traceId}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}

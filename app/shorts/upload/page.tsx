"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import { ensureCreatorConsent } from "@/lib/creator/ensure-creator-consent";

export default function FlitUploadPage() {
  const router =
    useRouter();

  const [
    videoFile,
    setVideoFile,
  ] =
    useState<File | null>(
      null,
    );

  const [
    videoPreviewUrl,
    setVideoPreviewUrl,
  ] =
    useState("");

  const [
    title,
    setTitle,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    visibility,
    setVisibility,
  ] =
    useState("public");

  const [
    isAdult,
    setIsAdult,
  ] =
    useState(false);

  const [
    uploading,
    setUploading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    traceId,
    setTraceId,
  ] =
    useState("");

  useEffect(() => {
    return () => {
      if (
        videoPreviewUrl
      ) {
        URL.revokeObjectURL(
          videoPreviewUrl,
        );
      }
    };
  }, [videoPreviewUrl]);

  function selectVideo(
    file:
      | File
      | undefined,
  ) {
    if (
      videoPreviewUrl
    ) {
      URL.revokeObjectURL(
        videoPreviewUrl,
      );
    }

    if (!file) {
      setVideoFile(null);
      setVideoPreviewUrl("");
      return;
    }

    setVideoFile(file);

    setVideoPreviewUrl(
      URL.createObjectURL(
        file,
      ),
    );

    setError("");
    setTraceId("");
  }

  async function uploadFlit() {
    if (
      !videoFile
    ) {
      setError(
        "영상 파일을 선택해주세요.",
      );

      return;
    }

    if (
      !title.trim()
    ) {
      setError(
        "제목을 입력해주세요.",
      );

      return;
    }

    const creatorConsentGranted =
      await ensureCreatorConsent();

    if (!creatorConsentGranted) {
      return;
    }

    setUploading(true);
    setError("");
    setTraceId("");

    try {
      const formData =
        new FormData();

      formData.append(
        "video",
        videoFile,
      );

      formData.append(
        "title",
        title.trim(),
      );

      formData.append(
        "description",
        description.trim(),
      );

      formData.append(
        "visibility",
        visibility,
      );

      formData.append(
        "isAdult",
        isAdult
          ? "true"
          : "false",
      );

      const response =
        await fetch(
          "/api/flit",
          {
            method: "POST",
            body: formData,
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        setError(
          data.error ||
            "FLIT 업로드에 실패했습니다.",
        );

        setTraceId(
          data.traceId ||
            "",
        );

        return;
      }

      setTraceId(
        data.traceId ||
          "",
      );

      router.push(
        "/shorts",
      );

      router.refresh();
    } catch (
      uploadError
    ) {
      console.error(
        "FLIT CLIENT UPLOAD ERROR",
        uploadError,
      );

      setError(
        "업로드 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-xs font-bold text-flat-yellow">
            FLAT LIVE
          </p>

          <h1 className="mt-2 text-3xl font-black">
            FLIT 올리기
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            영상을 선택하고 기본 정보를 입력하세요.
          </p>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <label className="block text-sm font-black">
              영상 선택
            </label>

            {videoPreviewUrl ? (
              <div className="mt-4">
                <video
                  src={
                    videoPreviewUrl
                  }
                  controls
                  playsInline
                  className="max-h-[520px] w-full rounded-2xl bg-black object-contain"
                />

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-xs text-zinc-400">
                    {
                      videoFile
                        ?.name
                    }
                  </p>

                  <label className="shrink-0 cursor-pointer rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold">
                    영상 변경

                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(
                        event,
                      ) => {
                        selectVideo(
                          event
                            .target
                            .files?.[0],
                        );
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="mt-4 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-black px-4 text-center">
                <span className="text-3xl">
                  ▶
                </span>

                <strong className="mt-3 text-sm">
                  영상 파일 선택
                </strong>

                <span className="mt-2 text-xs text-zinc-500">
                  MP4, MOV, WEBM · 현재 테스트 최대 200MB
                </span>

                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(
                    event,
                  ) => {
                    selectVideo(
                      event
                        .target
                        .files?.[0],
                    );
                  }}
                />
              </label>
            )}
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-black">
                  제목
                </label>

                <input
                  value={
                    title
                  }
                  maxLength={
                    100
                  }
                  onChange={(
                    event,
                  ) =>
                    setTitle(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="FLIT 제목을 입력하세요"
                  className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm outline-none focus:border-flat-yellow"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black">
                  설명
                </label>

                <textarea
                  value={
                    description
                  }
                  maxLength={
                    2000
                  }
                  onChange={(
                    event,
                  ) =>
                    setDescription(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="영상 설명, 태그 등을 입력하세요"
                  rows={5}
                  className="w-full resize-none rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm outline-none focus:border-flat-yellow"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black">
                  공개 설정
                </label>

                <select
                  value={
                    visibility
                  }
                  onChange={(
                    event,
                  ) =>
                    setVisibility(
                      event
                        .target
                        .value,
                    )
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm outline-none focus:border-flat-yellow"
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
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <strong className="text-sm">
              썸네일
            </strong>

            <p className="mt-1 text-xs text-zinc-500">
              다음 단계에서 영상 대표 장면 선택 기능을 연결합니다.
            </p>
          </section>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-sm font-bold text-red-300">
                {error}
              </p>

              {traceId && (
                <p className="mt-2 break-all text-[10px] text-zinc-500">
                  Trace ID:{" "}
                  {
                    traceId
                  }
                </p>
              )}
            </div>
          )}

          <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <label className="block text-sm font-black">
              연령 설정
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setIsAdult(false)
                }
                className={
                  !isAdult
                    ? "rounded-xl border border-flat-yellow bg-flat-yellow px-4 py-3 text-sm font-black text-black"
                    : "rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-400"
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
                    : "rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-400"
                }
              >
                🔞 19세 이상
              </button>
            </div>

            <p className="mt-2 text-xs leading-5 text-zinc-500">
              성인 대상 콘텐츠라면 반드시 19세 이상으로 설정해주세요.
            </p>
          </section>

          <button
            type="button"
            onClick={() => {
              void uploadFlit();
            }}
            disabled={
              uploading ||
              !videoFile ||
              !title.trim()
            }
            className="w-full rounded-2xl bg-flat-yellow px-5 py-4 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading
              ? "FLIT 업로드 중..."
              : "FLIT 업로드"}
          </button>
        </div>
      </div>
    </main>
  );
}

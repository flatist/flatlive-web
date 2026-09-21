"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

type DonationEffectType =
  | "single_video"
  | "continuous_image";

type DonationEffect = {
  id: string;
  name: string;
  amount: number;
  effectType: DonationEffectType;
  mediaType: "image" | "video";
  mediaUrl: string;
  originalFileName: string;
  durationMs?: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function AdminDonationEffectsPage() {
  const [effects, setEffects] =
    useState<DonationEffect[]>([]);

  const [name, setName] = useState("");
  const [amount, setAmount] =
    useState("100");

  const [effectType, setEffectType] =
    useState<DonationEffectType>(
      "single_video",
    );

  const [enabled, setEnabled] =
    useState(true);
  const [file, setFile] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(true);
  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState("");
  const [traceId, setTraceId] =
    useState("");

  const loadEffects = useCallback(
    async () => {
      try {
        setLoading(true);
        setMessage("");
        setTraceId("");

        const response = await fetch(
          "/api/admin/donation-effects",
          {
            cache: "no-store",
          },
        );

        const data =
          await response.json();

        if (!response.ok) {
          setMessage(
            data.error ??
              "후원 효과 목록을 불러오지 못했습니다.",
          );

          if (
            typeof data.traceId ===
            "string"
          ) {
            setTraceId(
              data.traceId,
            );
          }

          setEffects([]);
          return;
        }

        setEffects(
          Array.isArray(data.effects)
            ? data.effects
            : [],
        );
      } catch (error) {
        console.error(
          "DONATION EFFECT LOAD ERROR",
          error,
        );

        setMessage(
          "후원 효과 목록을 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadEffects();
  }, [loadEffects]);

  async function deleteEffect(
    effect: DonationEffect,
  ) {
    const confirmed =
      window.confirm(
        `${effect.amount.toLocaleString()} FLAT 후원 효과를 삭제할까요?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setMessage("");
      setTraceId("");

      const response =
        await fetch(
          "/api/admin/donation-effects",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              effectId:
                effect.id,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.error ??
            "후원 효과 삭제에 실패했습니다.",
        );

        if (
          typeof data.traceId ===
          "string"
        ) {
          setTraceId(
            data.traceId,
          );
        }

        return;
      }

      setMessage(
        `${effect.amount.toLocaleString()} FLAT 후원 효과가 삭제되었습니다.`,
      );

      if (
        typeof data.traceId ===
        "string"
      ) {
        setTraceId(
          data.traceId,
        );
      }

      await loadEffects();
    } catch (error) {
      console.error(
        "DONATION EFFECT DELETE ERROR",
        error,
      );

      setMessage(
        "후원 효과 삭제 중 오류가 발생했습니다.",
      );
    }
  }

  async function submitEffect(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    if (!file) {
      setMessage(
        "이미지 또는 영상 파일을 선택해주세요.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");
      setTraceId("");

      const formData =
        new FormData();

      formData.append(
        "name",
        name,
      );

      formData.append(
        "amount",
        amount,
      );

      formData.append(
        "effectType",
        effectType,
      );

      formData.append(
        "enabled",
        enabled
          ? "true"
          : "false",
      );

      formData.append(
        "file",
        file,
      );

      const response =
        await fetch(
          "/api/admin/donation-effects",
          {
            method: "POST",
            body: formData,
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.error ??
            "후원 효과 등록에 실패했습니다.",
        );

        if (
          typeof data.traceId ===
          "string"
        ) {
          setTraceId(
            data.traceId,
          );
        }

        return;
      }

      setMessage(
        "후원 효과가 등록되었습니다.",
      );

      if (
        typeof data.traceId ===
        "string"
      ) {
        setTraceId(
          data.traceId,
        );
      }

      setName("");
      setAmount("100");
      setEnabled(true);
      setFile(null);

      const input =
        document.getElementById(
          "donation-effect-file",
        ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }

      await loadEffects();
    } catch (error) {
      console.error(
        "DONATION EFFECT SUBMIT ERROR",
        error,
      );

      setMessage(
        "후원 효과 등록 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin"
          className="text-sm font-bold text-zinc-400 hover:text-white"
        >
          ← 관리자 대시보드
        </Link>

        <div className="mt-6">
          <p className="text-xs font-black tracking-[0.18em] text-yellow-400">
            FLATLIVE ADMIN
          </p>

          <h1 className="mt-2 text-3xl font-black">
            후원 효과 관리
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            일반 1회 선물 영상과 반복·순차 선물 이미지를 금액별로 따로 관리합니다.
          </p>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() =>
                setEffectType(
                  "single_video",
                )
              }
              className={`rounded-xl px-4 py-2 text-sm font-black ${
                effectType ===
                "single_video"
                  ? "bg-yellow-400 text-black"
                  : "border border-zinc-700 bg-zinc-900 text-zinc-400"
              }`}
            >
              1회 선물 영상
            </button>

            <button
              type="button"
              onClick={() =>
                setEffectType(
                  "continuous_image",
                )
              }
              className={`rounded-xl px-4 py-2 text-sm font-black ${
                effectType ===
                "continuous_image"
                  ? "bg-yellow-400 text-black"
                  : "border border-zinc-700 bg-zinc-900 text-zinc-400"
              }`}
            >
              연속 선물 이미지
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[420px_1fr]">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-black">
              {effectType ===
              "single_video"
                ? "1회 선물 영상 등록"
                : "연속 선물 이미지 등록"}
            </h2>

            <form
              onSubmit={submitEffect}
              className="mt-5 space-y-4"
            >
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-zinc-400">
                  이펙트명
                </span>

                <input
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value,
                    )
                  }
                  placeholder="예: 100 FLAT 하트"
                  maxLength={80}
                  disabled={submitting}
                  className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-bold text-white outline-none focus:border-yellow-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-zinc-400">
                  후원금액
                </span>

                <div className="flex items-center rounded-2xl border border-zinc-700 bg-zinc-950 px-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    disabled={submitting}
                    onChange={(event) =>
                      setAmount(
                        event.target.value.replace(
                          /[^0-9]/g,
                          "",
                        ),
                      )
                    }
                    className="h-12 min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none"
                  />

                  <span className="text-xs font-black text-yellow-400">
                    FLAT
                  </span>
                </div>

                <p className="mt-2 text-[11px] text-zinc-500">
                  이 금액으로 후원했을 때 등록한 효과가 재생됩니다.
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-zinc-400">
                  {effectType ===
                  "single_video"
                    ? "1회 선물 영상"
                    : "연속 선물 이미지"}
                </span>

                <input
                  id="donation-effect-file"
                  type="file"
                  accept={
                    effectType ===
                    "single_video"
                      ? "video/mp4,video/webm,video/quicktime,video/x-m4v"
                      : "image/jpeg,image/png,image/webp,image/gif"
                  }
                  disabled={submitting}
                  onChange={(event) =>
                    setFile(
                      event.target.files?.[0] ??
                        null,
                    )
                  }
                  className="block w-full rounded-2xl border border-zinc-700 bg-zinc-950 p-3 text-xs text-zinc-300 file:mr-3 file:rounded-xl file:border-0 file:bg-yellow-400 file:px-4 file:py-2 file:font-black file:text-black"
                />

                {file && (
                  <p className="mt-2 break-all text-[11px] text-zinc-500">
                    {file.name}
                  </p>
                )}
              </label>

              <label className="flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3">
                <div>
                  <p className="text-sm font-bold">
                    사용 여부
                  </p>

                  <p className="mt-1 text-[11px] text-zinc-500">
                    비활성화하면 방송에 표시되지 않습니다.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={submitting}
                  onChange={(event) =>
                    setEnabled(
                      event.target.checked,
                    )
                  }
                  className="h-5 w-5 accent-yellow-400"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="h-12 w-full rounded-2xl bg-yellow-400 text-sm font-black text-black disabled:opacity-50"
              >
                {submitting
                  ? "등록 중..."
                  : effectType ===
                      "single_video"
                    ? "1회 선물 영상 등록"
                    : "연속 선물 이미지 등록"}
              </button>
            </form>

            {message && (
              <div className="mt-4 rounded-2xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-200">
                {message}

                {traceId && (
                  <p className="mt-2 break-all text-[10px] text-zinc-500">
                    Trace ID:{" "}
                    {traceId}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">
                  {effectType ===
                  "single_video"
                    ? "등록된 1회 선물 영상"
                    : "등록된 연속 선물 이미지"}
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  총{" "}
                  {
                    effects.filter(
                      (effect) =>
                        effect.effectType ===
                        effectType,
                    ).length
                  }
                  개
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void loadEffects()
                }
                disabled={loading}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-xs font-bold text-zinc-300"
              >
                새로고침
              </button>
            </div>

            {loading ? (
              <div className="py-16 text-center text-sm text-zinc-500">
                불러오는 중...
              </div>
            ) : effects.filter(
                (effect) =>
                  effect.effectType ===
                  effectType,
              ).length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-zinc-700 py-16 text-center">
                <p className="font-bold text-zinc-400">
                  등록된 후원 효과가 없습니다.
                </p>

                <p className="mt-2 text-xs text-zinc-600">
                  왼쪽에서 첫 효과를 등록해주세요.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {effects
                  .filter(
                    (effect) =>
                      effect.effectType ===
                      effectType,
                  )
                  .map(
                  (effect) => (
                    <article
                      key={effect.id}
                      className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
                    >
                      <div className="flex aspect-video items-center justify-center overflow-hidden bg-black">
                        {effect.mediaType ===
                        "image" ? (
                          <img
                            src={
                              effect.mediaUrl
                            }
                            alt={
                              effect.name
                            }
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <video
                            src={
                              effect.mediaUrl
                            }
                            controls
                            muted
                            playsInline
                            className="h-full w-full object-contain"
                          />
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-black">
                              {effect.name}
                            </h3>

                            <p className="mt-1 text-xs font-bold text-yellow-400">
                              {effect.amount.toLocaleString()} FLAT
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${
                              effect.enabled
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-zinc-800 text-zinc-500"
                            }`}
                          >
                            {effect.enabled
                              ? "사용"
                              : "미사용"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void deleteEffect(
                              effect,
                            )
                          }
                          className="mt-4 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-400 hover:bg-red-500/20"
                        >
                          삭제
                        </button>

                        <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3 text-[11px] text-zinc-500">
                          <span>
                            {effect.mediaType ===
                            "image"
                              ? "이미지"
                              : "영상"}
                          </span>

                          <span>
                            {effect.effectType ===
                            "single_video"
                              ? "영상 전체 재생"
                              : "채팅 고정 이미지"}
                          </span>
                        </div>

                        <p className="mt-2 truncate text-[10px] text-zinc-600">
                          {
                            effect.originalFileName
                          }
                        </p>
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

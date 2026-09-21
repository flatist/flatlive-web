"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

type FitActivityRule = {
  code: string;
  label: string;
  category: string;
  enabled: boolean;
  rewardFit: number;
  watchSeconds: number | null;
  dailyCountLimit: number | null;
  dailyFitLimit: number | null;
  description: string;
};

type FitActivityConfig = {
  version: 1;
  updatedAt: string;
  rules: FitActivityRule[];
  purchaseRewardPercent: number;
};

export default function FitSettingsClient() {
  const [config, setConfig] =
    useState<FitActivityConfig | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function loadConfig() {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/fit-settings",
          { cache: "no-store" },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "FIT 설정을 불러오지 못했습니다.",
        );
      }

      setConfig(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "FIT 설정을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  const categories =
    useMemo(() => {
      if (!config) return [];

      return Array.from(
        new Set(
          config.rules.map(
            (rule) =>
              rule.category,
          ),
        ),
      );
    }, [config]);

  function updateRule(
    code: string,
    patch: Partial<FitActivityRule>,
  ) {
    setConfig((current) => {
      if (!current) return current;

      return {
        ...current,
        rules: current.rules.map(
          (rule) =>
            rule.code === code
              ? {
                  ...rule,
                  ...patch,
                }
              : rule,
        ),
      };
    });
  }

  async function saveConfig() {
    if (!config) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/fit-settings",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              rules: config.rules,
              purchaseRewardPercent:
                config.purchaseRewardPercent,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "FIT 설정 저장에 실패했습니다.",
        );
      }

      setConfig(data);
      setMessage(
        "FIT 적립 설정을 저장했습니다. 다음 적립부터 적용됩니다.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "FIT 설정 저장에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 pb-20 pt-20 text-zinc-950 md:px-6">
      <div className="mx-auto max-w-[1450px]">
        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-xs font-bold text-zinc-400 hover:text-zinc-950"
            >
              ← 관리자 대시보드
            </Link>

            <div className="mt-4 text-[10px] font-black tracking-[0.2em] text-zinc-400">
              FIT POINT ADMIN
            </div>

            <h1 className="mt-1 text-2xl font-black md:text-3xl">
              FIT 적립 설정
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              사용자의 활동별 FIT 지급량과 하루 적립 제한을 설정합니다.
              FLIT/VOD 시청은 ‘몇 초마다 몇 FIT’ 방식으로 계산됩니다.
              플핑 구매는 결제금액 기준 적립률(%)로 계산됩니다.
              저장한 값은 다음 적립부터 서버에서 적용됩니다.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void saveConfig();
            }}
            disabled={
              saving ||
              loading ||
              !config
            }
            className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-black text-white disabled:opacity-40"
          >
            {saving
              ? "저장 중..."
              : "설정 저장"}
          </button>
        </div>

        {message && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
            FIT 설정을 불러오는 중...
          </div>
        ) : config ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="text-xs font-bold text-zinc-400">
                  전체 활동
                </div>
                <div className="mt-2 text-2xl font-black">
                  {config.rules.length}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="text-xs font-bold text-zinc-400">
                  적립 ON
                </div>
                <div className="mt-2 text-2xl font-black">
                  {
                    config.rules.filter(
                      (rule) =>
                        rule.enabled,
                    ).length
                  }
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="text-xs font-bold text-zinc-400">
                  카테고리
                </div>
                <div className="mt-2 text-2xl font-black">
                  {categories.length}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="text-xs font-bold text-zinc-400">
                  최근 저장
                </div>
                <div className="mt-2 text-xs font-black">
                  {new Date(
                    config.updatedAt,
                  ).getTime() === 0
                    ? "기본값"
                    : new Date(
                        config.updatedAt,
                      ).toLocaleString(
                        "ko-KR",
                      )}
                </div>
              </div>
            </div>

            <section className="mt-5 rounded-2xl border border-yellow-300 bg-yellow-50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs font-black tracking-[0.18em] text-yellow-700">
                    PLSHOP PURCHASE FIT
                  </div>
                  <h2 className="mt-1 text-lg font-black">
                    플핑 구매 적립률
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    정상 결제금액 × 적립률로 FIT를 계산합니다.
                    예: 10,000원 × 1% = 100 FIT
                  </p>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={
                      config.purchaseRewardPercent
                    }
                    onChange={(event) => {
                      const value =
                        Number(
                          event.target.value,
                        );

                      setConfig((current) =>
                        current
                          ? {
                              ...current,
                              purchaseRewardPercent:
                                Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    Number.isFinite(
                                      value,
                                    )
                                      ? value
                                      : 0,
                                  ),
                                ),
                            }
                          : current,
                      );
                    }}
                    className="w-28 rounded-xl border border-yellow-300 bg-white px-3 py-2 text-right text-lg font-black outline-none focus:border-zinc-950"
                  />
                  <span className="text-lg font-black">
                    %
                  </span>
                </label>
              </div>
            </section>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <table className="min-w-[1260px] w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-black text-zinc-500">
                    <th className="px-4 py-3">
                      활동
                    </th>
                    <th className="px-4 py-3">
                      사용
                    </th>
                    <th className="px-4 py-3">
                      지급 FIT / 구매 %
                    </th>
                    <th className="px-4 py-3">
                      시청 적립 기준
                    </th>
                    <th className="px-4 py-3">
                      1일 횟수 제한
                    </th>
                    <th className="px-4 py-3">
                      1일 최대 FIT
                    </th>
                    <th className="px-4 py-3">
                      코드
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {config.rules.map(
                    (rule) => (
                      <tr
                        key={rule.code}
                        className="border-b border-zinc-100 align-top last:border-b-0"
                      >
                        <td className="px-4 py-4">
                          <div className="font-black">
                            {rule.label}
                          </div>

                          <div className="mt-1 text-[11px] font-bold text-zinc-400">
                            {rule.category}
                          </div>

                          <div className="mt-1 max-w-[320px] text-xs leading-5 text-zinc-500">
                            {
                              rule.description
                            }
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              updateRule(
                                rule.code,
                                {
                                  enabled:
                                    !rule.enabled,
                                },
                              );
                            }}
                            className={[
                              "rounded-full px-3 py-1.5 text-xs font-black",
                              rule.enabled
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-zinc-100 text-zinc-500",
                            ].join(" ")}
                          >
                            {rule.enabled
                              ? "ON"
                              : "OFF"}
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          {rule.code ===
                          "PLSHOP_PURCHASE" ? (
                            <div className="font-black text-yellow-700">
                              {
                                config.purchaseRewardPercent
                              }
                              %
                              <div className="mt-1 text-[10px] font-bold text-zinc-400">
                                결제금액 기준
                              </div>
                            </div>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={
                                rule.rewardFit
                              }
                              onChange={(
                                event,
                              ) => {
                                updateRule(
                                  rule.code,
                                  {
                                    rewardFit:
                                      Math.max(
                                        0,
                                        Math.floor(
                                          Number(
                                            event
                                              .target
                                              .value,
                                          ) || 0,
                                        ),
                                      ),
                                  },
                                );
                              }}
                              className="w-28 rounded-lg border border-zinc-200 px-3 py-2 font-black outline-none focus:border-zinc-950"
                            />
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {rule.code ===
                            "FLIT_WATCH" ||
                          rule.code ===
                            "VOD_WATCH" ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                step={1}
                                value={
                                  rule.watchSeconds ??
                                  30
                                }
                                onChange={(
                                  event,
                                ) => {
                                  updateRule(
                                    rule.code,
                                    {
                                      watchSeconds:
                                        Math.max(
                                          1,
                                          Math.floor(
                                            Number(
                                              event
                                                .target
                                                .value,
                                            ) || 1,
                                          ),
                                        ),
                                    },
                                  );
                                }}
                                className="w-20 rounded-lg border border-zinc-200 px-3 py-2 font-black outline-none focus:border-zinc-950"
                              />
                              <span className="text-xs font-black text-zinc-500">
                                초마다
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-300">
                              -
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={
                              rule.dailyCountLimit ??
                              ""
                            }
                            placeholder="무제한"
                            onChange={(
                              event,
                            ) => {
                              const value =
                                event.target
                                  .value;

                              updateRule(
                                rule.code,
                                {
                                  dailyCountLimit:
                                    value === ""
                                      ? null
                                      : Math.max(
                                          0,
                                          Math.floor(
                                            Number(
                                              value,
                                            ) || 0,
                                          ),
                                        ),
                                },
                              );
                            }}
                            className="w-32 rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-950"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={
                              rule.dailyFitLimit ??
                              ""
                            }
                            placeholder="무제한"
                            onChange={(
                              event,
                            ) => {
                              const value =
                                event.target
                                  .value;

                              updateRule(
                                rule.code,
                                {
                                  dailyFitLimit:
                                    value === ""
                                      ? null
                                      : Math.max(
                                          0,
                                          Math.floor(
                                            Number(
                                              value,
                                            ) || 0,
                                          ),
                                        ),
                                },
                              );
                            }}
                            className="w-32 rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-950"
                          />
                        </td>

                        <td className="px-4 py-4 font-mono text-[11px] text-zinc-400">
                          {rule.code}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
              FIT 숫자는 화면 코드에 고정하지 않고 이 설정을 서버가 읽어 지급합니다.
              플핑 구매 적립은 고정 FIT가 아니라 정상 결제금액의 설정 비율(%)로 계산합니다.
              현재 플핑 화면에는 주문/결제 완료 API가 아직 없어 실제 구매 완료 연결은
              주문/PG 기능이 생기는 시점에 awardFitPurchase를 호출하도록 연결합니다.
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

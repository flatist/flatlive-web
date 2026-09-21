"use client";

import {
  useEffect,
  useState,
} from "react";

import TreasureJarIcon from "@/app/live/common/TreasureJarIcon";

type Props = {
  roomId: string;
  onDone?: () => void;
  initialTab?: "TREASURE" | "PORTAL";
};


export default function TreasureJarGiftPanel({
  roomId,
  onDone,
  initialTab = "TREASURE",
}: Props) {
  const [tab, setTab] =
    useState<
      "TREASURE" | "PORTAL"
    >(initialTab);

  const [rewardFlat, setRewardFlat] =
    useState(100);

  const [winnerCount, setWinnerCount] =
    useState(0);

  const [portalPriceFlat, setPortalPriceFlat] =
    useState(100);

  const [portalDurationSeconds, setPortalDurationSeconds] =
    useState(180);

  const [balance, setBalance] =
    useState<number | null>(null);

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function loadBalance() {
    try {
      const response =
        await fetch(
          "/api/wallet",
          {
            cache: "no-store",
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        setBalance(null);
        return;
      }

      const candidates = [
        data?.balances?.FLAT,
        data?.balances?.flat,
        data?.flatBalance,
        data?.FLAT,
        data?.flat,
        data?.balance,
      ];

      const found =
        candidates
          .map((value) =>
            Number(value),
          )
          .find(
            (value) =>
              Number.isFinite(value),
          );

      setBalance(
        typeof found ===
          "number"
          ? found
          : null,
      );
    } catch {
      setBalance(null);
    }
  }

  useEffect(() => {
    void loadBalance();
  }, []);

  async function buyAndUse() {
    if (
      busy ||
      !roomId
    ) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/live/treasure-jar",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action:
                "CREATE",
              roomId,
              kind:
                tab,
              rewardFlat:
                tab ===
                "TREASURE"
                  ? rewardFlat
                  : undefined,
              winnerCount:
                tab ===
                "TREASURE"
                  ? (
                      winnerCount > 0
                        ? winnerCount
                        : undefined
                    )
                  : undefined,
              portalPriceFlat:
                tab === "PORTAL"
                  ? portalPriceFlat
                  : undefined,
              portalDurationSeconds:
                tab === "PORTAL"
                  ? portalDurationSeconds
                  : undefined,
            }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "구매에 실패했습니다.",
        );
      }

      await loadBalance();

      window.dispatchEvent(
        new CustomEvent(
          "flatlive:treasure-jar-created",
        ),
      );

      setMessage(
        tab ===
          "TREASURE"
          ? `${rewardFlat.toLocaleString()} FLAT 보물항아리 사용 · ${rewardPoolFlat.toLocaleString()} FLAT 랜덤 지급`
          : `${portalPriceFlat.toLocaleString()} FLAT 포털항아리 사용 · ${portalRewardPoolFlat.toLocaleString()} FLAT 랜덤 지급`,
      );

      window.setTimeout(
        () => {
          onDone?.();
        },
        500,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "구매에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  const price =
    tab === "TREASURE"
      ? rewardFlat
      : portalPriceFlat;

  const rewardPoolFlat =
    tab === "TREASURE"
      ? Math.max(
          1,
          Math.floor(
            rewardFlat * 0.8,
          ),
        )
      : 0;

  const portalRewardPoolFlat =
    Math.max(1, Math.floor(portalPriceFlat * 0.8));

  const maxPossibleWinnersByPool =
    Math.min(
      500,
      rewardPoolFlat,
    );

  const winnerOptions =
    rewardFlat === 20
      ? [0, 10]
      : rewardFlat === 100
        ? [0, 10, 20, 40]
        : [0, 40, 80, 100, 200];

  const insufficient =
    balance !== null &&
    balance < price;

  useEffect(() => {
    if (
      winnerCount > 0 &&
      (
        winnerCount >
          maxPossibleWinnersByPool ||
        !winnerOptions.includes(
          winnerCount,
        )
      )
    ) {
      setWinnerCount(0);
    }
  }, [
    maxPossibleWinnersByPool,
    rewardFlat,
    winnerCount,
  ]);

  return (
    <div className="mt-4">
      {/* FLATLIVE_TREASURE_JAR_GIFTSHOP_V2 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setTab(
              "TREASURE",
            );
            setMessage("");
          }}
          className={`rounded-2xl border p-3 text-left ${
            tab ===
            "TREASURE"
              ? "border-amber-300 bg-amber-300/10"
              : "border-white/10 bg-white/[0.04]"
          }`}
        >
          <div className="flex items-center gap-3">
            <TreasureJarIcon
              size={58}
            />
            <div>
              <p className="text-sm font-black text-white">
                보물항아리
              </p>
              <p className="mt-0.5 text-[10px] font-bold text-amber-300">
                랜덤 FLAT 보상
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab(
              "PORTAL",
            );
            setMessage("");
          }}
          className={`rounded-2xl border p-3 text-left ${
            tab ===
            "PORTAL"
              ? "border-yellow-300 bg-yellow-300/10"
              : "border-white/10 bg-white/[0.04]"
          }`}
        >
          <div className="flex items-center gap-3">
            <TreasureJarIcon
              portal
              size={58}
            />
            <div>
              <p className="text-sm font-black text-white">
                포털항아리
              </p>
              <p className="mt-0.5 text-[10px] font-bold text-zinc-200">
                다른 LIVE 시청자 초대
              </p>
            </div>
          </div>
        </button>
      </div>

      {tab ===
      "TREASURE" ? (
        <>
          <div className="mt-4 rounded-2xl border border-amber-300/15 bg-black/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-white">
                  보물항아리 구매금액
                </p>
                <p className="mt-1 text-[10px] leading-4 text-zinc-400">
                  참여 인원에 맞춰 랜덤 당첨 금액을 자동 계산합니다.
                </p>
              </div>
              <span className="text-lg font-black text-amber-300">
                {rewardFlat.toLocaleString()} FLAT
              </span>
            </div>

            {/* FLATLIVE_TREASURE_PAYOUT_DISPLAY_V9 */}
            <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2.5">
              <span className="text-xs font-black text-white">
                랜덤 지급 총액
              </span>
              <span className="text-base font-black text-amber-300">
                {rewardPoolFlat.toLocaleString()} FLAT
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[20, 100, 500].map(
                (amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() =>
                      setRewardFlat(
                        amount,
                      )
                    }
                    className={`rounded-xl border px-2 py-3 text-xs font-black ${
                      rewardFlat ===
                      amount
                        ? "border-amber-300 bg-amber-300 text-black"
                        : "border-white/10 bg-white/[0.04] text-white"
                    }`}
                  >
                    {amount.toLocaleString()}
                  </button>
                ),
              )}
            </div>

            <p className="mt-4 text-xs font-black text-white">
              라운드 당첨 인원
            </p>

            <div className="mt-2 grid grid-cols-5 gap-2">
              {winnerOptions.map(
                (count) => {
                  const disabled =
                    count > 0 &&
                    count >
                      maxPossibleWinnersByPool;

                  return (
                    <button
                      key={count}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        setWinnerCount(
                          count,
                        )
                      }
                      className={`rounded-xl border px-2 py-3 text-[11px] font-black ${
                        disabled
                          ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-zinc-600"
                          : winnerCount ===
                            count
                          ? "border-amber-300 bg-amber-300 text-black"
                          : "border-white/10 bg-white/[0.04] text-white"
                      }`}
                    >
                      {count === 0
                        ? "자동"
                        : `${count}명`}
                    </button>
                  );
                },
              )}
            </div>

            <p className="mt-2 text-[10px] leading-4 text-zinc-400">
              자동은 보상 풀에 맞춰 가능한 인원으로 계산됩니다.
              당첨자별 최대 금액은 평균의 2배 이내에서 계산되며,
              절대 최대는 20 FLAT입니다.
              선택 금액에 따라 가능한 당첨 인원이 자동으로 바뀝니다.
            </p>

            <p className="mt-3 text-[10px] leading-4 text-zinc-400">
              3분 카운트다운마다 참여자 중 설정한 인원만 랜덤 당첨됩니다.
              지급할 보상 FLAT이 남아 있으면 다음 라운드가
              다시 열립니다. 보상 FLAT이 모두 지급될 때까지 LIVE 화면에 유지됩니다.
            </p>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-violet-300/15 bg-black/30 p-4">
          {/* FLATLIVE_PORTAL_JAR_CONFIG_V2_11 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-white">
                포털항아리 가격
              </p>
              <p className="mt-1 text-[10px] leading-4 text-zinc-400">
                다른 활성 LIVE 일부에 랜덤 노출해 현재 방송으로 시청자를 초대합니다.
              </p>
            </div>
            <span className="text-lg font-black text-violet-300">
              {portalPriceFlat.toLocaleString()} FLAT
            </span>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {[20, 100, 500].map(
              (amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() =>
                    setPortalPriceFlat(
                      amount,
                    )
                  }
                  className={`rounded-xl border px-2 py-3 text-xs font-black ${
                    portalPriceFlat ===
                    amount
                      ? "border-yellow-300 bg-yellow-300 text-black"
                      : "border-white/10 bg-white/[0.04] text-white"
                  }`}
                >
                  {amount}
                </button>
              ),
            )}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-zinc-300/25 bg-zinc-300/10 px-3 py-2.5">
            <span className="text-xs font-black text-white">
              랜덤 지급 총액
            </span>
            <span className="text-base font-black text-yellow-300">
              {portalRewardPoolFlat.toLocaleString()} FLAT
            </span>
          </div>

          <p className="mt-4 text-xs font-black text-white">
            화면 노출 시간
          </p>

          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { seconds: 60, label: "1분" },
              { seconds: 180, label: "3분" },
              { seconds: 300, label: "5분" },
            ].map(
              ({ seconds, label }) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() =>
                    setPortalDurationSeconds(
                      seconds,
                    )
                  }
                  className={`rounded-xl border px-3 py-3 text-xs font-black ${
                    portalDurationSeconds ===
                    seconds
                      ? "border-yellow-300 bg-yellow-300 text-black"
                      : "border-white/10 bg-white/[0.04] text-white"
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>

          <p className="mt-3 text-[10px] leading-4 text-zinc-400">
            포털항아리은 선택한 시간 동안 무작위로 선택된 다른 LIVE에 표시됩니다.
            누르면 현재 방송으로 이동하며, 이 방송의 포털 장독대에 참여할 수 있습니다.
            시간이 끝나면 보물항아리과 같은 방식으로 랜덤 지급됩니다.
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2">
        <span className="text-[11px] font-bold text-zinc-400">
          보유 FLAT
        </span>
        <span className="text-xs font-black text-white">
          {balance === null
            ? "확인 중"
            : balance.toLocaleString()}
        </span>
      </div>

      {message && (
        <p className="mt-3 rounded-xl bg-white/[0.05] px-3 py-2 text-center text-[11px] font-bold text-white">
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          void buyAndUse();
        }}
        disabled={
          busy ||
          insufficient
        }
        className={`mt-4 w-full rounded-2xl px-4 py-4 text-sm font-black disabled:opacity-40 ${
          tab ===
          "TREASURE"
            ? "bg-amber-300 text-black"
            : "bg-yellow-300 text-black"
        }`}
      >
        {busy
          ? "구매 처리 중..."
          : insufficient
            ? "FLAT 잔액 부족"
            : `${price.toLocaleString()} FLAT 구매하고 사용`}
      </button>
    </div>
  );
}

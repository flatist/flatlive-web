"use client";

import { useEffect, useMemo, useState } from "react";

type DurationType = "THIRTY_DAYS" | "PERMANENT";

type FanCardSettings = {
  fanEnabled: boolean;
  fanMessage: string;
  fanPriceFlat: number;
  fanDurationType: DurationType;
  fanNicknameColor: string;
  vipEnabled: boolean;
  vipMessage: string;
  vipImageUrl: string;
  vipPriceFlat: number;
  vipDurationType: DurationType;
  vipNicknameColor: string;
};

const DEFAULT_SETTINGS: FanCardSettings = {
  fanEnabled: true,
  fanMessage: "오늘부터 우리 방송 팬이에요. 함께 웃고 응원해줘서 고마워요 💛",
  fanPriceFlat: 500,
  fanDurationType: "THIRTY_DAYS",
  fanNicknameColor: "#FACC15",
  vipEnabled: true,
  vipMessage: "가장 특별한 자리에서 함께해줘서 고마워요. VIP 팬은 더 특별하게 표시됩니다 👑",
  vipImageUrl: "",
  vipPriceFlat: 3000,
  vipDurationType: "PERMANENT",
  vipNicknameColor: "#A855F7",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-xs font-black text-zinc-400">
      {children}
    </label>
  );
}

function DurationButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-2xl bg-yellow-300 px-4 py-3 text-xs font-black text-black"
          : "rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs font-black text-zinc-400 transition hover:bg-white/10 hover:text-white"
      }
    >
      {children}
    </button>
  );
}

export default function FanCardSettingsClient() {
  const [settings, setSettings] = useState<FanCardSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingVipImage, setUploadingVipImage] = useState(false);
  const [message, setMessage] = useState("");

  const fanPreviewStyle = useMemo(
    () => ({ color: settings.fanNicknameColor }),
    [settings.fanNicknameColor],
  );

  const vipPreviewStyle = useMemo(
    () => ({ color: settings.vipNicknameColor }),
    [settings.vipNicknameColor],
  );

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/profile/fan-card-settings", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!mounted) {
          return;
        }

        if (data?.success && data.settings) {
          setSettings({
            fanEnabled: Boolean(data.settings.fanEnabled),
            fanMessage:
              typeof data.settings.fanMessage === "string"
                ? data.settings.fanMessage
                : DEFAULT_SETTINGS.fanMessage,
            fanPriceFlat: Number(data.settings.fanPriceFlat || 0),
            fanDurationType:
              data.settings.fanDurationType === "PERMANENT"
                ? "PERMANENT"
                : "THIRTY_DAYS",
            fanNicknameColor:
              typeof data.settings.fanNicknameColor === "string"
                ? data.settings.fanNicknameColor
                : DEFAULT_SETTINGS.fanNicknameColor,
            vipEnabled: Boolean(data.settings.vipEnabled),
            vipMessage:
              typeof data.settings.vipMessage === "string"
                ? data.settings.vipMessage
                : DEFAULT_SETTINGS.vipMessage,
            vipImageUrl:
              typeof data.settings.vipImageUrl === "string"
                ? data.settings.vipImageUrl
                : "",
            vipPriceFlat: Number(data.settings.vipPriceFlat || 0),
            vipDurationType:
              data.settings.vipDurationType === "THIRTY_DAYS"
                ? "THIRTY_DAYS"
                : "PERMANENT",
            vipNicknameColor:
              typeof data.settings.vipNicknameColor === "string"
                ? data.settings.vipNicknameColor
                : DEFAULT_SETTINGS.vipNicknameColor,
          });
        } else {
          setMessage(data?.message || "설정을 불러오지 못했습니다.");
        }
      } catch {
        if (mounted) {
          setMessage("설정을 불러오지 못했습니다.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  function update<K extends keyof FanCardSettings>(
    key: K,
    value: FanCardSettings[K],
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function uploadVipImage(file: File) {
    setUploadingVipImage(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/profile/fan-card-settings/vip-image",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (data?.success && typeof data.imageUrl === "string") {
        update("vipImageUrl", data.imageUrl);
        setMessage("VIP 이미지가 업로드됐습니다. 저장 버튼을 눌러 최종 저장해주세요.");
      } else {
        setMessage(data?.message || "VIP 이미지를 업로드하지 못했습니다.");
      }
    } catch {
      setMessage("VIP 이미지를 업로드하지 못했습니다.");
    } finally {
      setUploadingVipImage(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/profile/fan-card-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data?.success && data.settings) {
        setSettings(data.settings);
        setMessage("저장됐습니다.");
      } else {
        setMessage(data?.message || "저장하지 못했습니다.");
      }
    } catch {
      setMessage("저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="mt-6 rounded-3xl border border-white/[0.08] bg-zinc-950 p-6 text-sm font-bold text-zinc-400">
        팬카드 설정을 불러오는 중입니다.
      </section>
    );
  }

  return (
    <section className="mt-6 space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-yellow-300/20 bg-zinc-950 p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">일반 팬카드</h2>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                이미지는 사용하지 않고 메시지만 보여줍니다.
              </p>
            </div>

            <button
              type="button"
              onClick={() => update("fanEnabled", !settings.fanEnabled)}
              className={
                settings.fanEnabled
                  ? "rounded-full bg-yellow-300 px-4 py-2 text-xs font-black text-black"
                  : "rounded-full border border-white/10 px-4 py-2 text-xs font-black text-zinc-500"
              }
            >
              {settings.fanEnabled ? "사용중" : "꺼짐"}
            </button>
          </div>

          <div className="mt-5">
            <FieldLabel>팬카드 메시지</FieldLabel>
            <textarea
              value={settings.fanMessage}
              onChange={(event) => update("fanMessage", event.target.value)}
              maxLength={500}
              rows={5}
              className="w-full rounded-2xl border border-white/10 bg-black p-4 text-sm font-bold text-white outline-none focus:border-yellow-300/60"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>가격 FLAT</FieldLabel>
              <input
                type="number"
                min={0}
                value={settings.fanPriceFlat}
                onChange={(event) =>
                  update("fanPriceFlat", Math.max(0, Number(event.target.value || 0)))
                }
                className="w-full rounded-2xl border border-white/10 bg-black p-4 text-sm font-black text-white outline-none focus:border-yellow-300/60"
              />
            </div>

            <div>
              <FieldLabel>닉네임 색상</FieldLabel>
              <input
                type="color"
                value={settings.fanNicknameColor}
                onChange={(event) => update("fanNicknameColor", event.target.value)}
                className="h-[52px] w-full rounded-2xl border border-white/10 bg-black p-2"
              />
            </div>
          </div>

          <div className="mt-4">
            <FieldLabel>기간</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <DurationButton
                active={settings.fanDurationType === "THIRTY_DAYS"}
                onClick={() => update("fanDurationType", "THIRTY_DAYS")}
              >
                30일
              </DurationButton>
              <DurationButton
                active={settings.fanDurationType === "PERMANENT"}
                onClick={() => update("fanDurationType", "PERMANENT")}
              >
                영구
              </DurationButton>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/50 p-4">
            <div className="text-[11px] font-black text-zinc-500">미리보기</div>
            <div className="mt-2 text-sm font-bold text-zinc-300">
              <span className="text-zinc-500">[Lv.24]</span>{" "}
              <span style={fanPreviewStyle}>팬닉네임</span>
              <span className="text-zinc-500"> : 팬가입 완료!</span>
            </div>
            <div className="mt-4 rounded-2xl bg-zinc-900 p-4">
              <div className="text-xs font-black text-yellow-300">FAN CARD</div>
              <p className="mt-2 text-sm leading-6 text-white">
                {settings.fanMessage}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-purple-400/20 bg-gradient-to-br from-zinc-950 via-zinc-950 to-purple-950/20 p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">VIP 패스</h2>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                VIP는 이미지와 메시지를 함께 보여줍니다.
              </p>
            </div>

            <button
              type="button"
              onClick={() => update("vipEnabled", !settings.vipEnabled)}
              className={
                settings.vipEnabled
                  ? "rounded-full bg-purple-400 px-4 py-2 text-xs font-black text-black"
                  : "rounded-full border border-white/10 px-4 py-2 text-xs font-black text-zinc-500"
              }
            >
              {settings.vipEnabled ? "사용중" : "꺼짐"}
            </button>
          </div>

          <div className="mt-5">
            <FieldLabel>VIP 이미지</FieldLabel>

            <div className="space-y-3">
              <input
                value={settings.vipImageUrl}
                onChange={(event) => update("vipImageUrl", event.target.value)}
                placeholder="이미지 URL 또는 업로드 후 자동 입력"
                className="w-full rounded-2xl border border-white/10 bg-black p-4 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-purple-300/60"
              />

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-purple-300/30 bg-purple-500/5 px-4 py-5 text-center transition hover:bg-purple-500/10">
                <span className="text-sm font-black text-purple-200">
                  {uploadingVipImage
                    ? "VIP 이미지 업로드 중..."
                    : "VIP 이미지 업로드"}
                </span>

                <span className="mt-1 text-xs font-bold text-zinc-500">
                  jpg, png, webp, gif · 최대 5MB
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={uploadingVipImage}
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                      uploadVipImage(file);
                    }

                    event.currentTarget.value = "";
                  }}
                  className="hidden"
                />
              </label>

              {settings.vipImageUrl && (
                <button
                  type="button"
                  onClick={() => update("vipImageUrl", "")}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs font-black text-zinc-400 transition hover:bg-white hover:text-black"
                >
                  VIP 이미지 비우기
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <FieldLabel>VIP 메시지</FieldLabel>
            <textarea
              value={settings.vipMessage}
              onChange={(event) => update("vipMessage", event.target.value)}
              maxLength={500}
              rows={5}
              className="w-full rounded-2xl border border-white/10 bg-black p-4 text-sm font-bold text-white outline-none focus:border-purple-300/60"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>가격 FLAT</FieldLabel>
              <input
                type="number"
                min={0}
                value={settings.vipPriceFlat}
                onChange={(event) =>
                  update("vipPriceFlat", Math.max(0, Number(event.target.value || 0)))
                }
                className="w-full rounded-2xl border border-white/10 bg-black p-4 text-sm font-black text-white outline-none focus:border-purple-300/60"
              />
            </div>

            <div>
              <FieldLabel>닉네임 색상</FieldLabel>
              <input
                type="color"
                value={settings.vipNicknameColor}
                onChange={(event) => update("vipNicknameColor", event.target.value)}
                className="h-[52px] w-full rounded-2xl border border-white/10 bg-black p-2"
              />
            </div>
          </div>

          <div className="mt-4">
            <FieldLabel>기간</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <DurationButton
                active={settings.vipDurationType === "THIRTY_DAYS"}
                onClick={() => update("vipDurationType", "THIRTY_DAYS")}
              >
                30일
              </DurationButton>
              <DurationButton
                active={settings.vipDurationType === "PERMANENT"}
                onClick={() => update("vipDurationType", "PERMANENT")}
              >
                영구
              </DurationButton>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/50 p-4">
            <div className="text-[11px] font-black text-zinc-500">미리보기</div>
            <div className="mt-2 text-sm font-bold text-zinc-300">
              <span className="text-zinc-500">[Lv.42]</span>{" "}
              <span style={vipPreviewStyle}>VIP닉네임</span>
              <span className="text-zinc-500"> : VIP 입장!</span>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl bg-zinc-900">
              {settings.vipImageUrl ? (
                <img
                  src={settings.vipImageUrl}
                  alt="VIP 패스 미리보기"
                  className="h-36 w-full object-cover"
                />
              ) : (
                <div className="flex h-36 items-center justify-center bg-purple-500/10 text-4xl">
                  👑
                </div>
              )}

              <div className="p-4">
                <div className="text-xs font-black text-purple-300">VIP PASS</div>
                <p className="mt-2 text-sm leading-6 text-white">
                  {settings.vipMessage}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-sm font-bold text-zinc-300">
          {message}
        </div>
      )}

      <div className="sticky bottom-4 z-20 rounded-3xl border border-white/10 bg-zinc-950/95 p-4 backdrop-blur">
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="w-full rounded-2xl bg-yellow-300 px-5 py-4 text-sm font-black text-black transition hover:bg-yellow-200 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "팬카드 설정 저장"}
        </button>
      </div>
    </section>
  );
}

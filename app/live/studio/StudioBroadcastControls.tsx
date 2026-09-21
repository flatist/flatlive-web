"use client";

type Props = {
  cameraOn: boolean;
  micOn: boolean;
  roomId: string;
  liveStarting: boolean;
  videoInfo: string;

  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
  toggleMicrophone: () => void;
  startLive: () => void | Promise<void>;

  requestStopLive: (
    shouldExit: boolean,
  ) => void;
};

export default function StudioBroadcastControls({
  cameraOn,
  micOn,
  roomId,
  liveStarting,
  videoInfo,

  startCamera,
  stopCamera,
  toggleMicrophone,
  startLive,

  requestStopLive,
}: Props) {
  return (
    <>
          {/* FLATLIVE_MOBILE_STUDIO_CONTROLS */}
          <div className="grid grid-cols-3 gap-2 border-t border-zinc-800 bg-zinc-950 p-3 md:hidden">
            {!cameraOn ? (
              <button
                type="button"
                onClick={startCamera}
                className="col-span-2 h-12 rounded-xl bg-white text-xs font-black text-black"
              >
                📷 카메라 · 마이크 켜기
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleMicrophone}
                  className={
                    micOn
                      ? "h-12 rounded-xl bg-white/10 text-xs font-black text-white"
                      : "h-12 rounded-xl bg-red-600 text-xs font-black text-white"
                  }
                >
                  {micOn ? "🎤 마이크" : "🔇 마이크"}
                </button>

                <button
                  type="button"
                  onClick={stopCamera}
                  className="h-12 rounded-xl bg-white/10 text-xs font-black text-white"
                >
                  📷 카메라 끄기
                </button>
              </>
            )}

            {cameraOn && !roomId && (
              <button
                type="button"
                onClick={startLive}
                disabled={liveStarting}
                className="h-12 rounded-xl bg-red-600 text-xs font-black text-white disabled:opacity-50"
              >
                {liveStarting ? "시작 중..." : "● LIVE 시작"}
              </button>
            )}

            {roomId && (
              <button
                type="button"
                onClick={() => {
                  requestStopLive(false);
                }}
                className="h-12 rounded-xl bg-red-700 text-xs font-black text-white"
              >
                ■ 방송 종료
              </button>
            )}
          </div>

          <div className="hidden flex-wrap gap-3 p-5 md:flex">
            {!cameraOn ? (
              <button
                onClick={startCamera}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black"
              >
                카메라 · 마이크 켜기
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="rounded-xl bg-zinc-700 px-5 py-3 text-sm font-black"
              >
                카메라 · 마이크 끄기
              </button>
            )}

            {cameraOn &&
              !roomId && (
                <button
                  onClick={startLive}
                  disabled={
                    liveStarting
                  }
                  className="rounded-xl bg-green-600 px-5 py-3 text-sm font-black disabled:opacity-50"
                >
                  {liveStarting
                    ? "방송 시작 중..."
                    : "방송 시작"}
                </button>
              )}

            {roomId && (
              <button
                onClick={() => {
                  requestStopLive(false);
                }}
                className="rounded-xl bg-red-700 px-5 py-3 text-sm font-black"
              >
                방송 종료
              </button>
            )}

            <div className="rounded-xl bg-zinc-900 px-4 py-3 text-xs">
              카메라:{" "}
              {cameraOn
                ? "ON"
                : "OFF"}
            </div>

            {/* FLATLIVE_MIC_TOGGLE_BUTTON */}
            {cameraOn && (
              <button
                type="button"
                onClick={
                  toggleMicrophone
                }
                className={
                  micOn
                    ? "rounded-xl border border-green-500/50 bg-green-600 px-5 py-3 text-sm font-black text-white"
                    : "rounded-xl border border-red-500/50 bg-red-700 px-5 py-3 text-sm font-black text-white"
                }
              >
                {micOn
                  ? "🎤 마이크 ON"
                  : "🔇 마이크 OFF"}
              </button>
            )}

            <div className="rounded-xl bg-zinc-900 px-4 py-3 text-xs">
              마이크:{" "}
              {micOn
                ? "ON"
                : "OFF"}
            </div>

            {videoInfo && (
              <div className="rounded-xl bg-zinc-900 px-4 py-3 text-xs">
                실제 카메라:{" "}
                {videoInfo}
              </div>
            )}
          </div>


    </>
  );
}

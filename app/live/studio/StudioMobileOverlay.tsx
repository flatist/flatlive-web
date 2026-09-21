"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import MobileDraggableChatOverlay from "../common/MobileDraggableChatOverlay";
import TreasureJarIcon from "@/app/live/common/TreasureJarIcon";
import TreasureJarGiftPanel from "@/app/live/common/TreasureJarGiftPanel";
import StudioBanManager from "./StudioBanManager";
import StudioKickModal from "./StudioKickModal";
import StudioViewerActionMenu from "./StudioViewerActionMenu";
import { useStudioLiveManagers } from "./useStudioLiveManagers";
import StudioChatMuteModal, {
  type StudioChatMuteInfo,
} from "./StudioChatMuteModal";
import type {
  StudioViewerInfo,
} from "./StudioViewerList";

type Position =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

type Size =
  | "small"
  | "medium"
  | "large";

type Count =
  | 3
  | 5
  | 10;

type MobileChatMessage = {
  id: string;
  viewerId?: string;
  userId?: string;
  username?: string;
  nickname?: string;
  message: string;
  isBroadcaster?: boolean;
  isManager?: boolean;
  levelLabel?: string | null;
  loungeBadge?: string | null;
  nicknameTone?: "DEFAULT" | "FAN" | "VIP" | "BROADCASTER";
};

type MobileViewer = {
  viewerId: string;
  userId: string;
  username: string;
  nickname: string;
  avatarUrl: string;
  isGuest: boolean;
};

type Props = {
  videoRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;


  roomId: string;
  liveTime: string;
  viewerCount: number;
  viewerList: MobileViewer[];
  clutchActive?: boolean;

  chatMessages: MobileChatMessage[];

  cameraOn: boolean;
  micOn: boolean;
  liveStarting: boolean;

  liveTitle: string;
  setLiveTitle: (
    value: string
  ) => void;

  liveCategory: string;
  setLiveCategory: (
    value: string
  ) => void;

  isAdult: boolean;
  setIsAdult: (
    value: boolean
  ) => void;

  studioLiveTitleEdit: string;
  setStudioLiveTitleEdit: (
    value: string
  ) => void;

  studioLiveTitleSaving: boolean;
  studioLiveTitleMessage: string;

  chatInput: string;
  setChatInput: (
    value: string
  ) => void;

  chatSending: boolean;
  chatError: string;
  error: string;

  chatPosition: Position;
  setChatPosition: (
    value: Position
  ) => void;

  chatSize: Size;
  setChatSize: (
    value: Size
  ) => void;

  chatCount: Count;
  setChatCount: (
    value: Count
  ) => void;

  chatX: number;
  setChatX: (
    value: number
  ) => void;

  chatY: number;
  setChatY: (
    value: number
  ) => void;

  onCamera: () => void;
  onMicrophone: () => void;

  onStartLive: () => void;
  onStopLive: () => void;

  onSaveTitle: () => void;

  onSubmitChat: (
    event:
      FormEvent<HTMLFormElement>
  ) => void | Promise<void>;
};

export default function StudioMobileOverlay({
  videoRect,
  roomId,
  liveTime,
  viewerCount,
  viewerList,
  clutchActive = false,
  chatMessages,

  cameraOn,
  micOn,
  liveStarting,

  liveTitle,
  setLiveTitle,

  liveCategory,
  setLiveCategory,

  isAdult,
  setIsAdult,

  studioLiveTitleEdit,
  setStudioLiveTitleEdit,

  studioLiveTitleSaving,
  studioLiveTitleMessage,

  chatInput,
  setChatInput,

  chatSending,
  chatError,
  error,

  chatSize,
  setChatSize,

  chatCount,
  setChatCount,

  chatX,
  setChatX,

  chatY,
  setChatY,

  onCamera,
  onMicrophone,

  onStartLive,
  onStopLive,

  onSaveTitle,
  onSubmitChat,
}: Props) {

  // FLATLIVE_MOBILE_TREASURE_JAR_POSITION_V1
  const [treasureJarOpen, setTreasureJarOpen] =
    useState(false);

  // FLATLIVE_MOBILE_MANAGER_RUNTIME_ORDER_FIX_V1
  const {
    managerUserIds:
      mobileManagerUserIds,
    setManagerState:
      setMobileManagerState,
  } =
    useStudioLiveManagers(
      roomId,
    );

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const [
    inputOpen,
    setInputOpen,
  ] = useState(false);

  // FLATLIVE_ANDROID_CAMERA_TOUCH_FIX_V1
  const cameraPointerHandledRef = useRef(false);

  // FLATLIVE_MOBILE_VIEWER_MODERATION_V1
  const [
    viewerPanelOpen,
    setViewerPanelOpen,
  ] = useState(false);

  const [
    selectedViewer,
    setSelectedViewer,
  ] = useState<MobileViewer | null>(
    null,
  );

  // FLATLIVE_MOBILE_BAN_MANAGER_V1
  // FLATLIVE_MOBILE_CHAT_MUTE_V2
  const [
    selectedChatMuteViewer,
    setSelectedChatMuteViewer,
  ] =
    useState<StudioViewerInfo | null>(
      null,
    );

  const [
    mobileChatMutes,
    setMobileChatMutes,
  ] =
    useState<
      StudioChatMuteInfo[]
    >([]);

  async function loadMobileChatMutes() {
    if (!roomId) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/live/chat-moderation?roomId=${encodeURIComponent(
            roomId,
          )}`,
          {
            cache: "no-store",
          },
        );

      const data =
        await response.json();

      if (
        response.ok &&
        Array.isArray(data.mutes)
      ) {
        setMobileChatMutes(
          data.mutes,
        );
      }
    } catch (error) {
      console.error(
        "MOBILE LIVE CHAT MUTE LIST FAILED",
        error,
      );
    }
  }

  useEffect(() => {
    void loadMobileChatMutes();

    const timer =
      window.setInterval(() => {
        void loadMobileChatMutes();
      }, 2000);

    return () => {
      window.clearInterval(timer);
    };
  }, [roomId]);

  const [
    banManagerOpen,
    setBanManagerOpen,
  ] = useState(false);

  // FLATLIVE_MOBILE_CHAT_DRAG
  const mobileChatRef =
    useRef<HTMLDivElement>(null);

  const mobileChatDragRef =
    useRef<{
      pointerId: number;
      offsetX: number;
      offsetY: number;
    } | null>(null);

  const [mounted, setMounted] =
    useState(false);

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  const [
    keyboardInset,
    setKeyboardInset,
  ] = useState(0);

  useEffect(() => {
    const viewport =
      window.visualViewport;

    if (!viewport) {
      return;
    }

    const updateKeyboardInset = () => {
      const inset =
        Math.max(
          0,
          window.innerHeight -
            viewport.height -
            viewport.offsetTop,
        );

      setKeyboardInset(inset);
    };

    updateKeyboardInset();

    viewport.addEventListener(
      "resize",
      updateKeyboardInset,
    );

    viewport.addEventListener(
      "scroll",
      updateKeyboardInset,
    );

    window.addEventListener(
      "orientationchange",
      updateKeyboardInset,
    );

    return () => {
      viewport.removeEventListener(
        "resize",
        updateKeyboardInset,
      );

      viewport.removeEventListener(
        "scroll",
        updateKeyboardInset,
      );

      window.removeEventListener(
        "orientationchange",
        updateKeyboardInset,
      );
    };
  }, []);

  const content = (
    <div className="pointer-events-none fixed inset-0 z-[1000] h-[100dvh] w-[100dvw] max-w-[100dvw] overflow-hidden md:hidden">

      {/* FLATLIVE_MOBILE_STUDIO_BACK_BUTTON_V2 */}
      <button
        type="button"
        aria-label="방송 화면 나가기"
        onClick={() => {
          window.location.href = "/";
        }}
        className="pointer-events-auto fixed left-3 top-[calc(14px+env(safe-area-inset-top))] z-[1600] flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/85 text-xl font-black text-white shadow-2xl backdrop-blur-md md:hidden"
      >
        ←
      </button>


      {/* FLATLIVE_MOBILE_VIEWER_TOP_VISIBLE_V2 */}
      {/* 상단 최소 정보 */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[1450] flex items-start justify-between bg-gradient-to-b from-black/80 via-black/35 to-transparent px-3 pb-10 pt-[calc(10px+env(safe-area-inset-top))] md:hidden">
        <div className="flex items-center gap-2">
          {roomId ? (
            <>
              <div className="flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-[10px] font-black text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                LIVE
              </div>

              <span className="text-[11px] font-black text-white drop-shadow">
                {liveTime}
              </span>
            </>
          ) : (
            <div className="rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold text-zinc-200 backdrop-blur">
              방송 준비
            </div>
          )}
        </div>

        {roomId && (
          <button
            type="button"
            onClick={() => {
              setInputOpen(false);
              setMenuOpen(false);
              setViewerPanelOpen(true);
            }}
            className="pointer-events-auto rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur"
            aria-label="현재 시청자 보기"
          >
            👥 {viewerCount}
          </button>
        )}
      </div>

      {/* FLATLIVE_MOBILE_VIEWER_PANEL_V1 */}
      {viewerPanelOpen && roomId && (
        <div className="pointer-events-auto fixed inset-0 z-[1600] flex items-end md:hidden">
          <button
            type="button"
            aria-label="시청자 목록 닫기"
            onClick={() => {
              setViewerPanelOpen(false);
            }}
            className="absolute inset-0 bg-black/65"
          />

          <div className="relative z-10 max-h-[72dvh] w-full overflow-hidden rounded-t-[28px] border-t border-white/10 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div>
                <div className="text-base font-black text-white">
                  현재 시청자
                </div>

                <div className="mt-0.5 text-[11px] text-zinc-500">
                  {viewerCount}명 접속 중
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setViewerPanelOpen(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(72dvh-74px)] overflow-y-auto px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3">
              {viewerList.length === 0 ? (
                <div className="rounded-2xl bg-zinc-900 px-4 py-8 text-center text-xs text-zinc-500">
                  현재 접속 중인 시청자가 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {viewerList.map(
                    (viewer, index) => {
                      const displayName =
                        viewer.nickname ||
                        viewer.username ||
                        `게스트 ${index + 1}`;

                      return (
                        <div
                          key={viewer.viewerId}
                          className="flex items-center justify-between rounded-2xl border border-white/5 bg-zinc-900 px-3 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-700 bg-cover bg-center text-xs font-black text-white"
                              style={
                                viewer.avatarUrl
                                  ? {
                                      backgroundImage:
                                        `url(${viewer.avatarUrl})`,
                                    }
                                  : undefined
                              }
                            >
                              {!viewer.avatarUrl &&
                                displayName
                                  .slice(0, 1)
                                  .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <div className="truncate text-sm font-black text-white">
                                  {displayName}
                                </div>

                                {viewer.userId &&
                                  mobileManagerUserIds.has(
                                    viewer.userId,
                                  ) && (
                                    <span className="shrink-0 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[8px] font-black tracking-wide text-blue-300">
                                      ★ MANAGER
                                    </span>
                                  )}
                              </div>

                              <div className="mt-0.5 truncate text-[10px] text-zinc-500">
                                {viewer.username
                                  ? `@${viewer.username}`
                                  : "게스트"}
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {/* FLATLIVE_VIEWER_ACTION_MENU_MOBILE_V1 */}
                            <StudioViewerActionMenu
                              roomId={roomId}
                              viewer={viewer}
                              isManager={
                                !!viewer.userId &&
                                mobileManagerUserIds.has(
                                  viewer.userId,
                                )
                              }
                              isMuted={
                                !!viewer.userId &&
                                mobileChatMutes.some(
                                  (mute) =>
                                    mute.targetUserId ===
                                    viewer.userId,
                                )
                              }
                              onManagerChanged={(
                                enabled,
                              ) => {
                                if (
                                  viewer.userId
                                ) {
                                  setMobileManagerState(
                                    viewer.userId,
                                    enabled,
                                  );
                                }
                              }}
                              onChatMute={() => {
                                setSelectedChatMuteViewer(
                                  viewer,
                                );
                              }}
                              onKick={() => {
                                setSelectedViewer(
                                  viewer,
                                );
                              }}
                            />
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 오류 */}
      {error && (
        <div className="pointer-events-none absolute inset-x-3 top-[calc(58px+env(safe-area-inset-top))] rounded-xl bg-red-950/90 px-3 py-2 text-[11px] font-bold text-red-200">
          {error}
        </div>
      )}

      {/* FLATLIVE_MOBILE_PORTAL_CHAT */}
      {!clutchActive &&
        !inputOpen &&
        roomId &&
        chatMessages.length > 0 && (
          <div
            className="pointer-events-none absolute z-[260]"
            style={
              videoRect
                ? clutchActive
                  ? {
                      left: videoRect.left,
                      top:
                        videoRect.top +
                        videoRect.height,
                      width: videoRect.width,
                      bottom:
                        "calc(92px + env(safe-area-inset-bottom))",
                    }
                  : {
                      left: videoRect.left,
                      top: videoRect.top,
                      width: videoRect.width,
                      height: videoRect.height,
                    }
                : {
                    inset: 0,
                  }
            }
          >
            <MobileDraggableChatOverlay
            roomId={roomId}
            actionMode="studio"
            messages={chatMessages}
            size={chatSize}
            count={chatCount}
            x={chatX}
            y={chatY}
            onPositionChange={(
              nextX,
              nextY,
            ) => {
              setChatX(
                nextX,
              );

              setChatY(
                nextY,
              );
            }}
            positioning="absolute"
            scrollable={true}
          />
          </div>
        )}

      {/* 필요할 때만 댓글 입력 */}
      {inputOpen && roomId && (
        <div
          className="pointer-events-auto fixed z-[520]"
          style={{
            left: "12px",
            right: "12px",
            width: "auto",
            maxWidth: "calc(100dvw - 24px)",
            bottom:
              keyboardInset >= 180
                ? `${keyboardInset + 8}px`
                : "calc(12px + env(safe-area-inset-bottom))",
          }}
        >
          <form
            onSubmit={(event) => {
              void Promise.resolve(
                onSubmitChat(event)
              ).finally(() => {
                setInputOpen(false);
              });
            }}
            className="pointer-events-auto flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-2xl border border-white/15 bg-black/90 p-2 shadow-2xl backdrop-blur-xl"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(event) => {
                setChatInput(
                  event.target.value
                );
              }}
              placeholder="댓글 입력"
              enterKeyHint="send"
              autoComplete="off"
              className="min-w-0 max-w-full flex-1 bg-transparent px-2 py-2 text-base text-white outline-none placeholder:text-zinc-500"
            />

            <button
              type="submit"
              disabled={
                chatSending ||
                !chatInput.trim()
              }
              className="shrink-0 rounded-xl bg-yellow-400 px-3 py-2 text-xs font-black text-black disabled:opacity-40"
            >
              전송
            </button>
          </form>

          {chatError && (
            <div className="mt-1 rounded-lg bg-red-950/90 px-3 py-1.5 text-[10px] text-red-200">
              {chatError}
            </div>
          )}
        </div>
      )}

      {/* 하단 카메라 컨트롤 */}
      {/* FLATLIVE_MOBILE_TREASURE_JAR_TOP_FIXED_V2
          일반 LIVE와 CLUTCH 모두 상단 정보 아래의 같은 위치를 사용해
          하단 조작 메뉴와 CLUTCH 게이지 충돌을 피한다. */}
      {roomId && !inputOpen && !menuOpen && !treasureJarOpen && (
        <button
          type="button"
          aria-label="장독대 선물 열기"
          aria-expanded={treasureJarOpen}
          onClick={() => {
            setTreasureJarOpen(true);
          }}
          className="pointer-events-auto fixed right-3 top-[calc(92px+env(safe-area-inset-top))] z-[1480] flex h-14 w-14 items-center justify-center rounded-full border border-amber-300/60 bg-black/85 shadow-[0_8px_28px_rgba(0,0,0,0.55)] backdrop-blur-md transition-transform duration-200 active:scale-95 md:hidden"
        >
          <TreasureJarIcon size={42} />
          <span className="sr-only">장독대 선물</span>
        </button>
      )}

      {treasureJarOpen && roomId && (
        <div className="pointer-events-auto fixed inset-0 z-[1800] flex items-end md:hidden">
          <button
            type="button"
            aria-label="장독대 선물 닫기"
            onClick={() => {
              setTreasureJarOpen(false);
            }}
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-label="장독대 선물"
            className="relative z-10 flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-t-[28px] border-t border-amber-300/25 bg-zinc-950 shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <TreasureJarIcon size={36} />
                <div>
                  <p className="text-sm font-black text-white">장독대 선물</p>
                  <p className="text-[10px] font-bold text-zinc-400">보물독 · 포털독</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => {
                  setTreasureJarOpen(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl font-black text-white"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
              <TreasureJarGiftPanel
                roomId={roomId}
                onDone={() => {
                  setTreasureJarOpen(false);
                }}
              />
            </div>
          </section>
        </div>
      )}

      <div
        className={[
          "absolute inset-x-0 bottom-0 z-[300] bg-gradient-to-t from-black/95 via-black/65 to-transparent px-2 pb-[calc(18px+env(safe-area-inset-bottom))] pt-10 transition-opacity",
          inputOpen
            ? "pointer-events-none opacity-0"
            : "opacity-100",
        ].join(" ")}
      >
        <div className="pointer-events-none mx-auto grid w-full max-w-[100dvw] grid-cols-5 items-end justify-items-center gap-1">

          <button
            type="button"
            onClick={onMicrophone}
            className={[
              "pointer-events-auto flex h-11 w-11 flex-col items-center justify-center rounded-full border text-[9px] font-black backdrop-blur",
              micOn
                ? "border-white/20 bg-black/60 text-white"
                : "border-red-500/40 bg-red-950/80 text-red-300",
            ].join(" ")}
          >
            <span className="text-lg">
              {micOn
                ? "🎙️"
                : "🔇"}
            </span>
            MIC
          </button>

          <button
            type="button"
            // FLATLIVE_ANDROID_CAMERA_TOUCH_FIX_V1
            onPointerDown={(event) => {
              if (
                event.pointerType === "touch" ||
                event.pointerType === "pen"
              ) {
                cameraPointerHandledRef.current = true;
                onCamera();
              }
            }}
            onClick={() => {
              if (cameraPointerHandledRef.current) {
                cameraPointerHandledRef.current = false;
                return;
              }

              onCamera();
            }}
            className="pointer-events-auto touch-manipulation select-none flex h-11 w-11 flex-col items-center justify-center rounded-full border border-white/20 bg-black/60 text-[9px] font-black text-white backdrop-blur"
          >
            <span className="text-lg">
              📷
            </span>
            {cameraOn
              ? "CAM"
              : "켜기"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setInputOpen(
                (open) => !open
              );
            }}
            disabled={!roomId}
            className="pointer-events-auto flex h-11 w-11 flex-col items-center justify-center rounded-full border border-white/20 bg-black/60 text-[9px] font-black text-white backdrop-blur disabled:opacity-30"
          >
            <span className="text-lg">
              💬
            </span>
            입력
          </button>

          <button
            type="button"
            // FLATLIVE_ANDROID_STUDIO_MENU_FAST_OPEN_V1
            onPointerDown={(event) => {
              if (
                event.pointerType === "touch" ||
                event.pointerType === "pen"
              ) {
                setInputOpen(false);
                setMenuOpen(true);
              }
            }}
            onClick={() => {
              setInputOpen(false);
              setMenuOpen(true);
            }}
            className="pointer-events-auto touch-manipulation flex h-11 w-11 select-none flex-col items-center justify-center rounded-full border border-white/20 bg-black/60 text-[9px] font-black text-white backdrop-blur"
          >
            <span className="text-xl leading-none">
              ☰
            </span>
            메뉴
          </button>

          {/* FLATLIVE_MOBILE_START_OUTSIDE_REMOVED_V1_FINAL */}
          {roomId && (
            <button
              type="button"
              onClick={onStopLive}
              className="pointer-events-auto flex h-11 w-11 flex-col items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-xl"
            >
              <span className="text-lg">
                ■
              </span>
              종료
            </button>
          )}
        </div>
      </div>

      {/* 하단 설정 메뉴 */}
      {menuOpen && (
        <div className="pointer-events-auto fixed inset-0 z-[500] flex h-[100dvh] items-end overflow-hidden">

          <button
            type="button"
            aria-label="설정 메뉴 닫기"
            onClick={() => {
              setMenuOpen(false);
            }}
            className="absolute inset-0 bg-black/55"
          />

          <div className="relative z-10 flex max-h-[82dvh] w-full transform-gpu flex-col overflow-hidden rounded-t-[28px] border-t border-white/10 bg-zinc-950 shadow-2xl will-change-transform">
            <div className="shrink-0 px-4 pt-3">

            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-600" />

            <div className="mb-5 flex items-center justify-between">
              <div className="text-base font-black text-white">
                방송 설정
              </div>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg text-white"
              >
                ×
              </button>
            </div>

            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(24px+env(safe-area-inset-bottom))]"
              style={{
                WebkitOverflowScrolling: "touch",
              }}
            >
              <div className="space-y-5">

              {/* FLATLIVE_MOBILE_START_IN_MENU_V1_FINAL */}
              {!roomId && (
                <section>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onStartLive();
                    }}
                    disabled={liveStarting}
                    className="flex w-full items-center justify-center rounded-2xl bg-yellow-400 px-4 py-3.5 text-sm font-black text-black shadow-[0_8px_24px_rgba(0,0,0,.35)] disabled:opacity-50"
                  >
                    {liveStarting
                      ? "방송 시작 중..."
                      : "방송 시작"}
                  </button>
                </section>
              )}

              {/* FLATLIVE_MOBILE_ROOM_ID_DISPLAY_V1 */}
              {roomId && (
                <section>
                  <div className="mb-2 text-xs font-black text-zinc-300">
                    현재 Room ID
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1 break-all rounded-xl border border-zinc-800 bg-black px-3 py-3 font-mono text-[11px] text-zinc-300">
                      {roomId}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard
                          ?.writeText(roomId)
                          .catch(() => {});
                      }}
                      className="shrink-0 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-xs font-black text-white"
                    >
                      복사
                    </button>
                  </div>
                </section>
              )}

              {/* FLATLIVE_MOBILE_BAN_MANAGER_MENU_V1 */}
              {roomId && (
                <section>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setBanManagerOpen(true);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-left"
                  >
                    <div>
                      <div className="text-xs font-black text-red-300">
                        강퇴자 관리
                      </div>

                      <div className="mt-1 text-[10px] text-zinc-500">
                        1일·영구 강퇴 확인 및 해제
                      </div>
                    </div>

                    <span className="text-sm font-black text-red-300">
                      ›
                    </span>
                  </button>
                </section>
              )}

              {/* 제목 */}
              <section>
                <div className="mb-2 text-xs font-black text-zinc-300">
                  방송 제목
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={
                      roomId
                        ? studioLiveTitleEdit
                        : liveTitle
                    }
                    onChange={(event) => {
                      if (roomId) {
                        setStudioLiveTitleEdit(
                          event.target.value
                        );
                      } else {
                        setLiveTitle(
                          event.target.value
                        );
                      }
                    }}
                    placeholder="방송 제목"
                    className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-3 py-3 text-base text-white outline-none"
                  />

                  {roomId && (
                    <button
                      type="button"
                      onClick={onSaveTitle}
                      disabled={
                        studioLiveTitleSaving
                      }
                      className="rounded-xl bg-white px-4 text-xs font-black text-black disabled:opacity-40"
                    >
                      {studioLiveTitleSaving
                        ? "저장중"
                        : "저장"}
                    </button>
                  )}
                </div>

                {studioLiveTitleMessage && (
                  <div className="mt-1 text-[10px] text-zinc-400">
                    {studioLiveTitleMessage}
                  </div>
                )}
              </section>

              {/* 카테고리 */}
              <section>
                <div className="mb-2 text-xs font-black text-zinc-300">
                  카테고리
                </div>

                <select
                  value={liveCategory}
                  disabled={
                    Boolean(roomId)
                  }
                  onChange={(event) => {
                    setLiveCategory(
                      event.target.value
                    );
                  }}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-3 text-base text-white disabled:opacity-40"
                >
                  <option value="토크">
                    토크
                  </option>
                  <option value="음악">
                    음악
                  </option>
                  <option value="게임">
                    게임
                  </option>
                  <option value="먹방">
                    먹방
                  </option>
                  <option value="뷰티">
                    뷰티
                  </option>
                  <option value="스포츠">
                    스포츠
                  </option>
                  <option value="기타">
                    기타
                  </option>
                </select>
              </section>

              {/* 성인방송 */}
              <section className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black p-3">
                <div>
                  <div className="text-xs font-black text-white">
                    성인 방송
                  </div>

                  <div className="mt-1 text-[10px] text-zinc-500">
                    방송 시작 전에 설정
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    Boolean(roomId)
                  }
                  onClick={() => {
                    setIsAdult(
                      !isAdult
                    );
                  }}
                  className={[
                    "rounded-full px-3 py-1.5 text-[10px] font-black",
                    isAdult
                      ? "bg-red-600 text-white"
                      : "bg-zinc-800 text-zinc-300",
                  ].join(" ")}
                >
                  {isAdult
                    ? "ON"
                    : "OFF"}
                </button>
              </section>

              <div className="rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 text-[11px] font-bold text-zinc-400">
                댓글 위의 ━ 손잡이를 끌어 위치를 이동할 수 있습니다.
              </div>

              {/* 댓글 크기 */}
              <section>
                <div className="mb-2 text-xs font-black text-zinc-300">
                  댓글 크기
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["small", "작게"],
                      ["medium", "보통"],
                      ["large", "크게"],
                    ] as const
                  ).map(
                    ([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setChatSize(
                            value
                          );
                        }}
                        className={[
                          "rounded-xl border px-2 py-2.5 text-xs font-bold",
                          chatSize === value
                            ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
                            : "border-zinc-700 bg-black text-zinc-300",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
              </section>

              {/* 표시 개수 */}
              <section>
                <div className="mb-2 text-xs font-black text-zinc-300">
                  댓글 표시 개수
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [3, 5, 10] as const
                  ).map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setChatCount(
                            value
                          );
                        }}
                        className={[
                          "rounded-xl border px-2 py-2.5 text-xs font-bold",
                          chatCount === value
                            ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
                            : "border-zinc-700 bg-black text-zinc-300",
                        ].join(" ")}
                      >
                        {value}개
                      </button>
                    )
                  )}
                </div>
              </section>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLATLIVE_MOBILE_BAN_MANAGER_PANEL_V1 */}
      {banManagerOpen && (
        <div className="pointer-events-auto fixed inset-0 z-[1900] flex items-end md:hidden">
          <button
            type="button"
            aria-label="강퇴자 관리 닫기"
            onClick={() => {
              setBanManagerOpen(false);
            }}
            className="absolute inset-0 bg-black/70"
          />

          <div className="relative z-10 max-h-[78dvh] w-full overflow-hidden rounded-t-[28px] border-t border-white/10 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div>
                <div className="text-base font-black text-white">
                  강퇴자 관리
                </div>

                <div className="mt-0.5 text-[11px] text-zinc-500">
                  1일·영구 강퇴 사용자
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBanManagerOpen(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(78dvh-74px)] overflow-y-auto px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4">
              <StudioBanManager />
            </div>
          </div>
        </div>
      )}

      <StudioChatMuteModal
        roomId={roomId}
        viewer={
          selectedChatMuteViewer
        }
        currentMute={
          selectedChatMuteViewer
            ? mobileChatMutes.find(
                (mute) =>
                  mute.targetUserId ===
                  selectedChatMuteViewer.userId,
              ) ?? null
            : null
        }
        onClose={() => {
          setSelectedChatMuteViewer(
            null,
          );
        }}
        onChanged={() => {
          void loadMobileChatMutes();
        }}
      />

      <StudioKickModal
        roomId={roomId}
        viewer={selectedViewer}
        onClose={() => {
          setSelectedViewer(null);
        }}
      />
    </div>
  );

  // FLATLIVE_MOBILE_VIEWER_MANAGER_STATUS_V1


  if (!mounted) {
    return null;
  }

  return createPortal(
    content,
    document.body,
  );
}

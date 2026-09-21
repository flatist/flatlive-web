"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  ComponentType,
  Dispatch,
  FormEvent,
  RefObject,
  SetStateAction,
} from "react";

import StudioViewerList from "./StudioViewerList";
import LiveLevelBadge from "@/app/live/common/LiveLevelBadge";
import LiveChatUserMenu from "@/app/live/common/LiveChatUserMenu";

type LiveChatMessage = {
  id: string;
  roomId: string;
  viewerId?: string;
  userId: string;
  username: string;
  nickname: string;
  message: string;
  isBroadcaster?: boolean;
  isManager?: boolean;
  levelLabel?: string | null;
  loungeBadge?: string | null;
  fanTier?: "FAN" | "VIP" | null;
  nicknameTone?: "DEFAULT" | "FAN" | "VIP" | "BROADCASTER";
  messageType?: "CHAT" | "RECOMMEND";
  donationMode?: "single" | "repeat" | "sequence";
  createdAt: number;
};

type Viewer = {
  viewerId: string;
  userId: string;
  username: string;
  nickname: string;
  avatarUrl: string;
  isGuest: boolean;
};

type ActiveDonationEffect = {
  id: string;
  name: string;
  amount: number;
  mediaType: "image" | "video";
  mediaUrl: string;
  durationMs: number;
  enabled: boolean;
  playbackId: string;
};

type Props = {
  roomId: string;
  viewerCount: number;
  viewerList: Viewer[];

  viewerPanelOpen: boolean;
  setViewerPanelOpen: Dispatch<
    SetStateAction<boolean>
  >;

  watchUrl: string;

  StudioDonationChatStaticEffect: ComponentType<{
    message: string;
  }>;

  chatOverlayEnabled: boolean;
  setChatOverlayEnabled: Dispatch<
    SetStateAction<boolean>
  >;

  chatOverlayPosition: any;
  setChatOverlayPosition: Dispatch<
    SetStateAction<any>
  >;

  chatOverlaySize: any;
  setChatOverlaySize: Dispatch<
    SetStateAction<any>
  >;

  chatOverlayCount: 3 | 5 | 10;
  setChatOverlayCount: Dispatch<
    SetStateAction<3 | 5 | 10>
  >;

  chatOverlayOpacity: 50 | 70 | 90;
  setChatOverlayOpacity: Dispatch<
    SetStateAction<50 | 70 | 90>
  >;

  activeDonationEffect:
    | ActiveDonationEffect
    | null;

  setActiveDonationEffect: Dispatch<
    SetStateAction<
      ActiveDonationEffect | null
    >
  >;

  setActiveDonationEffectChatId: Dispatch<
    SetStateAction<string>
  >;

  chatMessages: LiveChatMessage[];

  chatBottomRef:
    RefObject<HTMLDivElement | null>;

  chatInput: string;
  setChatInput: Dispatch<
    SetStateAction<string>
  >;

  chatSending: boolean;

  chatError: string;
  setChatError: Dispatch<
    SetStateAction<string>
  >;

  sendChat: (
    event: FormEvent<HTMLFormElement>
  ) => void;
};

export default function StudioPcChatPanel({
  roomId,
  viewerCount,
  viewerList,

  viewerPanelOpen,
  setViewerPanelOpen,

  watchUrl,

  StudioDonationChatStaticEffect,

  chatOverlayEnabled,
  setChatOverlayEnabled,

  chatOverlayPosition,
  setChatOverlayPosition,

  chatOverlaySize,
  setChatOverlaySize,

  chatOverlayCount,
  setChatOverlayCount,

  chatOverlayOpacity,
  setChatOverlayOpacity,

  activeDonationEffect,
  setActiveDonationEffect,
  setActiveDonationEffectChatId,

  chatMessages,
  chatBottomRef,

  chatInput,
  setChatInput,

  chatSending,

  chatError,
  setChatError,

  sendChat,
}: Props) {
  // FLATLIVE_STUDIO_PC_CHAT_SCROLL_LATEST_V1
  const studioChatScrollRef = useRef<HTMLDivElement | null>(null);
  const studioChatPinnedRef = useRef(true);
  const previousStudioChatCountRef = useRef(0);

  const [
    showStudioLatestChatButton,
    setShowStudioLatestChatButton,
  ] = useState(false);

  const [
    studioLatestChatCount,
    setStudioLatestChatCount,
  ] = useState(0);

  function handleStudioChatScroll() {
    const box = studioChatScrollRef.current;

    if (!box) {
      return;
    }

    const distanceFromBottom =
      box.scrollHeight - box.scrollTop - box.clientHeight;

    const pinned = distanceFromBottom < 90;
    studioChatPinnedRef.current = pinned;

    if (pinned) {
      setShowStudioLatestChatButton(false);
      setStudioLatestChatCount(0);
    }
  }

  function goToStudioLatestChat() {
    chatBottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });

    studioChatPinnedRef.current = true;
    setShowStudioLatestChatButton(false);
    setStudioLatestChatCount(0);
  }

  useEffect(() => {
    const previousCount = previousStudioChatCountRef.current;
    const currentCount = chatMessages.length;

    if (previousCount === 0) {
      previousStudioChatCountRef.current = currentCount;

      window.requestAnimationFrame(() => {
        chatBottomRef.current?.scrollIntoView({
          block: "end",
        });
      });

      return;
    }

    if (currentCount <= previousCount) {
      previousStudioChatCountRef.current = currentCount;
      return;
    }

    const addedCount = currentCount - previousCount;
    previousStudioChatCountRef.current = currentCount;

    if (studioChatPinnedRef.current) {
      window.requestAnimationFrame(() => {
        chatBottomRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      });
      return;
    }

    setStudioLatestChatCount((value) => value + addedCount);
    setShowStudioLatestChatButton(true);
  }, [chatMessages.length, chatBottomRef]);


  return (
<aside className="hidden w-[300px] shrink-0 flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950 md:flex md:h-[calc(100dvh-96px)] md:min-h-0 md:max-h-[calc(100dvh-96px)]">
              {/* FLATLIVE_STUDIO_SIDE_PANEL_CONTENT */}

              {/* FLATLIVE_PC_CHAT_OVERLAY_CONTROLS */}
              <div className="border-b border-zinc-800 bg-black/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-black text-white">
                    영상 위 댓글
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setChatOverlayEnabled(
                        (enabled) => !enabled,
                      );
                    }}
                    className={
                      chatOverlayEnabled
                        ? "rounded-full bg-yellow-400 px-2.5 py-1 text-[10px] font-black text-black"
                        : "rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] font-black text-zinc-300"
                    }
                  >
                    {chatOverlayEnabled
                      ? "ON"
                      : "OFF"}
                  </button>
                </div>

                {chatOverlayEnabled && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <select
                      value={chatOverlayPosition}
                      onChange={(event) => {
                        setChatOverlayPosition(
                          event.target.value as
                            | "top-left"
                            | "top-right"
                            | "bottom-left"
                            | "bottom-right",
                        );
                      }}
                      className="h-8 rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-[10px] text-white"
                    >
                      <option value="top-left">
                        좌상
                      </option>
                      <option value="top-right">
                        우상
                      </option>
                      <option value="bottom-left">
                        좌하
                      </option>
                      <option value="bottom-right">
                        우하
                      </option>
                    </select>

                    <select
                      value={chatOverlaySize}
                      onChange={(event) => {
                        setChatOverlaySize(
                          event.target.value as
                            | "small"
                            | "medium"
                            | "large",
                        );
                      }}
                      className="h-8 rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-[10px] text-white"
                    >
                      <option value="small">
                        작게
                      </option>
                      <option value="medium">
                        보통
                      </option>
                      <option value="large">
                        크게
                      </option>
                    </select>

                    <select
                      value={chatOverlayCount}
                      onChange={(event) => {
                        setChatOverlayCount(
                          Number(
                            event.target.value,
                          ) as 3 | 5 | 10,
                        );
                      }}
                      className="h-8 rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-[10px] text-white"
                    >
                      <option value={3}>
                        3개
                      </option>
                      <option value={5}>
                        5개
                      </option>
                      <option value={10}>
                        10개
                      </option>
                    </select>

                    <select
                      value={chatOverlayOpacity}
                      onChange={(event) => {
                        setChatOverlayOpacity(
                          Number(
                            event.target.value,
                          ) as 50 | 70 | 90,
                        );
                      }}
                      className="h-8 rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-[10px] text-white"
                    >
                      <option value={50}>
                        연하게
                      </option>
                      <option value={70}>
                        보통
                      </option>
                      <option value={90}>
                        진하게
                      </option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                <div>
                  <div className="text-sm font-black text-white">
                    실시간 채팅
                  </div>

                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    {chatMessages.length}개
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setViewerPanelOpen(
                      (open) => !open,
                    );
                  }}
                  className={
                    viewerPanelOpen
                      ? "rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-2.5 py-1.5 text-[11px] font-black text-yellow-400"
                      : "rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-bold text-zinc-300 hover:bg-zinc-800"
                  }
                  aria-expanded={
                    viewerPanelOpen
                  }
                >
                  시청자 목록{" "}
                  {viewerPanelOpen
                    ? "▲"
                    : "▼"}
                </button>
              </div>

              {viewerPanelOpen && (
                <div className="border-b border-zinc-800 bg-black/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-black text-white">
                      현재 시청자
                    </span>

                    <span className="text-[10px] text-zinc-500">
                      {viewerCount}명 접속
                    </span>
                  </div>

                  {/* FLATLIVE_STUDIO_VIEWER_LIST_COMPONENT */}
                  <StudioViewerList
                    roomId={roomId}
                    viewers={viewerList}
                  />
                </div>
              )}

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
                {activeDonationEffect?.mediaType ===
                  "video" && (
                  <div className="mb-3 flex justify-start">
                    <video
                      key={
                        activeDonationEffect.playbackId
                      }
                      src={
                        activeDonationEffect.mediaUrl
                      }
                      autoPlay
                      playsInline
                      muted
                      preload="auto"
                      className="max-h-[130px] max-w-[210px] object-contain"
                      onEnded={() => {
                        setActiveDonationEffect(
                          null,
                        );

                        setActiveDonationEffectChatId(
                          "",
                        );
                      }}
                    />
                  </div>
                )}

                {chatMessages.length ===
                0 ? (
                  <div className="py-8 text-center text-sm text-zinc-500">
                    아직 댓글이 없습니다.
                  </div>
                ) : (
                  <div
                    ref={studioChatScrollRef}
                    onScroll={handleStudioChatScroll}
                    className="relative min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-6 pr-1 [-webkit-overflow-scrolling:touch]"
                  >
                    {chatMessages.map(
                      (chat) => (
                        <div
                          key={chat.id}
                          className="text-sm leading-6"
                        >
                          {chat.loungeBadge && (
                            <span className="mr-1.5 rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 text-[11px] font-black text-white">
                              {chat.loungeBadge}
                            </span>
                          )}

                          {chat.isManager && !chat.isBroadcaster ? (
                            <span className="mr-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-yellow-300/30 bg-yellow-300/10 px-1.5 text-[10px] font-black text-yellow-200">
                              M
                            </span>
                          ) : null}

                          {!chat.isBroadcaster && (
                            <LiveLevelBadge label={chat.levelLabel} />
                          )}

                          {chat.nicknameTone === "VIP" ? (
                            <span className="mr-1">👑</span>
                          ) : chat.nicknameTone === "FAN" ? (
                            <span className="mr-1 text-rose-300">♥</span>
                          ) : null}

                          <LiveChatUserMenu
                            mode="studio"
                            roomId={roomId}
                            viewerId={chat.viewerId}
                            userId={chat.userId}
                            username={chat.username}
                            nickname={chat.nickname}
                            isBroadcaster={chat.isBroadcaster}
                            isManager={chat.isManager}
                            triggerClassName={[
                              "mr-2 inline font-black underline-offset-2 hover:underline",
                              chat.nicknameTone === "BROADCASTER"
                                ? "text-yellow-300"
                                : chat.nicknameTone === "VIP"
                                  ? "text-fuchsia-300"
                                  : chat.nicknameTone === "FAN"
                                    ? "text-amber-300"
                                    : chat.isManager
                                      ? "text-amber-400"
                                      : "text-white",
                            ].join(" ")}
                          >
                            {chat.nickname || chat.username}
                          </LiveChatUserMenu>

                          <span
                            className={
                              chat.isBroadcaster
                                ? "break-words font-semibold text-yellow-200"
                                : chat.isManager
                                  ? "break-words font-semibold text-amber-300"
                                  : "break-words text-zinc-200"
                            }
                          >
                            {chat.message}
                          </span>

                          {(chat.donationMode ===
                            "repeat" ||
                            chat.donationMode ===
                              "sequence") && (
                            <StudioDonationChatStaticEffect
                              message={
                                chat.message
                              }
                            />
                          )}
                        </div>
                      ),
                    )}

                    <div
                      ref={chatBottomRef}
                    />

                    {showStudioLatestChatButton && (
                      <button
                        type="button"
                        onClick={goToStudioLatestChat}
                        aria-label="최신 채팅으로 이동"
                        title="최신 채팅으로 이동"
                        className="sticky bottom-3 z-30 mx-auto mt-2 flex h-10 min-w-10 items-center justify-center gap-1 rounded-full border border-yellow-300/40 bg-yellow-400 px-3 text-base font-black text-black shadow-xl transition hover:bg-yellow-300 active:scale-95"
                      >
                        <span aria-hidden="true">↓</span>
                        {studioLatestChatCount > 0 && (
                          <span className="text-[10px] font-black">
                            {studioLatestChatCount}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <form
                onSubmit={sendChat}
                className="flex items-center gap-2 border-t border-zinc-800 p-3"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) => {
                    setChatInput(
                      event.target.value,
                    );

                    if (chatError) {
                      setChatError("");
                    }
                  }}
                  maxLength={300}
                  disabled={!roomId}
                  placeholder={
                    roomId
                      ? "댓글을 입력하세요..."
                      : "방송 시작 후 댓글을 사용할 수 있습니다."
                  }
                  className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400 disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={
                    !roomId ||
                    chatSending ||
                    !chatInput.trim()
                  }
                  className="h-11 shrink-0 rounded-xl bg-yellow-400 px-4 text-sm font-black text-black disabled:opacity-40"
                >
                  {chatSending
                    ? "전송 중"
                    : "전송"}
                </button>
              </form>

              {chatError && (
                <div className="border-t border-red-900/40 bg-red-950/30 px-4 py-2 text-xs text-red-300">
                  {chatError}
                </div>
              )}

              {roomId && (
                <div className="border-t border-zinc-800 p-3">
                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden"
                  >
                    새 창에서 시청 테스트
                  </a>
                </div>
              )}
            </aside>
  );
}

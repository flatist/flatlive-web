"use client";

// FLATLIVE_COMMON_NORMALIZED_CHAT_OVERLAY

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  PointerEvent as ReactPointerEvent,
} from "react";

import LiveLevelBadge from "@/app/live/common/LiveLevelBadge";
import LiveChatUserMenu from "@/app/live/common/LiveChatUserMenu";

type Size =
  | "small"
  | "medium"
  | "large";

type ChatMessage = {
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
  fanTier?: "FAN" | "VIP" | null;
  nicknameTone?: "DEFAULT" | "FAN" | "VIP" | "BROADCASTER";
};

type Positioning =
  | "fixed"
  | "absolute";

type Props = {
  messages: ChatMessage[];

  roomId?: string;
  actionMode?: "viewer" | "studio";

  size: Size;

  count:
    | 3
    | 5
    | 10;

  x: number;
  y: number;

  onPositionChange: (
    x: number,
    y: number,
  ) => void;

  draggable?: boolean;

  opacity?: number;

  compact?: boolean;

  scrollable?: boolean;

  positioning?: Positioning;
};

export default function MobileDraggableChatOverlay({
  messages,
  roomId = "",
  actionMode = "viewer",
  size,
  count,
  x,
  y,
  onPositionChange,
  draggable = true,
  opacity = 100,
  compact = false,
  scrollable = true,
  positioning = "fixed",
}: Props) {
  const boxRef =
    useRef<HTMLDivElement>(null);

  const listRef =
    useRef<HTMLDivElement>(null);

  const dragRef =
    useRef<{
      pointerId: number;
      offsetX: number;
      offsetY: number;
    } | null>(null);

  const previousMessageCountRef =
    useRef(0);

  const [
    followingLatest,
    setFollowingLatest,
  ] = useState(true);

  const [
    showLatestButton,
    setShowLatestButton,
  ] = useState(false);

  const [
    displayPosition,
    setDisplayPosition,
  ] = useState({
    left: 0,
    top: 0,
  });

  const rowHeight =
    size === "small"
      ? 22
      : size === "large"
        ? 32
        : 26;

  const getContainerRect = () => {
    const box =
      boxRef.current;

    if (
      positioning === "absolute" &&
      box?.offsetParent instanceof
        HTMLElement
    ) {
      return box.offsetParent
        .getBoundingClientRect();
    }

    return {
      left: 0,
      top: 0,
      width:
        window.innerWidth,
      height:
        window.innerHeight,
    };
  };

  const syncDisplayPosition = () => {
    const box =
      boxRef.current;

    if (!box) {
      return;
    }

    const container =
      getContainerRect();

    const boxRect =
      box.getBoundingClientRect();

    const rawLeft =
      container.width *
      (
        Math.max(
          0,
          Math.min(
            100,
            x,
          ),
        ) /
        100
      );

    const rawTop =
      container.height *
      (
        Math.max(
          0,
          Math.min(
            100,
            y,
          ),
        ) /
        100
      );

    const maxLeft =
      Math.max(
        0,
        container.width -
          boxRect.width,
      );

    const maxTop =
      Math.max(
        0,
        container.height -
          boxRect.height,
      );

    setDisplayPosition({
      left:
        Math.max(
          0,
          Math.min(
            maxLeft,
            rawLeft,
          ),
        ),

      top:
        Math.max(
          0,
          Math.min(
            maxTop,
            rawTop,
          ),
        ),
    });
  };

  useEffect(() => {
    const frame =
      window.requestAnimationFrame(
        syncDisplayPosition,
      );

    return () => {
      window.cancelAnimationFrame(
        frame,
      );
    };
  }, [
    x,
    y,
    size,
    count,
    compact,
    positioning,
    messages.length,
  ]);

  useEffect(() => {
    const box =
      boxRef.current;

    if (!box) {
      return;
    }

    const target =
      positioning === "absolute" &&
      box.offsetParent instanceof
        HTMLElement
        ? box.offsetParent
        : document.documentElement;

    const observer =
      new ResizeObserver(() => {
        syncDisplayPosition();
      });

    observer.observe(box);
    observer.observe(target);

    window.addEventListener(
      "resize",
      syncDisplayPosition,
    );

    return () => {
      observer.disconnect();

      window.removeEventListener(
        "resize",
        syncDisplayPosition,
      );
    };
  }, [
    positioning,
  ]);

  const scrollToLatest = (
    behavior:
      ScrollBehavior = "smooth",
  ) => {
    const list =
      listRef.current;

    if (!list) {
      return;
    }

    list.scrollTo({
      top:
        list.scrollHeight,
      behavior,
    });

    setFollowingLatest(
      true,
    );

    setShowLatestButton(
      false,
    );
  };

  useEffect(() => {
    if (!scrollable) {
      return;
    }

    const previousCount =
      previousMessageCountRef.current;

    const hasNewMessage =
      messages.length >
      previousCount;

    previousMessageCountRef.current =
      messages.length;

    if (
      hasNewMessage &&
      followingLatest
    ) {
      window.requestAnimationFrame(
        () => {
          scrollToLatest(
            "auto",
          );
        },
      );
    }
  }, [
    messages.length,
    followingLatest,
    scrollable,
  ]);

  useEffect(() => {
    if (!scrollable) {
      return;
    }

    window.requestAnimationFrame(
      () => {
        scrollToLatest(
          "auto",
        );
      },
    );
  }, [
    scrollable,
  ]);

  const handleScroll = () => {
    if (!scrollable) {
      return;
    }

    const list =
      listRef.current;

    if (!list) {
      return;
    }

    const distanceFromBottom =
      list.scrollHeight -
      list.scrollTop -
      list.clientHeight;

    const isLatest =
      distanceFromBottom <= 16;

    setFollowingLatest(
      isLatest,
    );

    setShowLatestButton(
      !isLatest,
    );
  };

  const startDrag = (
    event:
      ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!draggable) {
      return;
    }

    if (
      event.pointerType ===
        "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    const box =
      boxRef.current;

    if (!box) {
      return;
    }

    const rect =
      box.getBoundingClientRect();

    dragRef.current = {
      pointerId:
        event.pointerId,

      offsetX:
        event.clientX -
        rect.left,

      offsetY:
        event.clientY -
        rect.top,
    };

    event.currentTarget
      .setPointerCapture(
        event.pointerId,
      );

    event.preventDefault();
  };

  const moveDrag = (
    event:
      ReactPointerEvent<HTMLDivElement>,
  ) => {
    const drag =
      dragRef.current;

    const box =
      boxRef.current;

    if (
      !draggable ||
      !drag ||
      !box ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    const container =
      getContainerRect();

    const boxRect =
      box.getBoundingClientRect();

    const nextLeft =
      Math.max(
        0,
        Math.min(
          Math.max(
            0,
            container.width -
              boxRect.width,
          ),

          event.clientX -
            container.left -
            drag.offsetX,
        ),
      );

    const nextTop =
      Math.max(
        0,
        Math.min(
          Math.max(
            0,
            container.height -
              boxRect.height,
          ),

          event.clientY -
            container.top -
            drag.offsetY,
        ),
      );

    const nextX =
      Number(
        (
          (
            nextLeft /
            Math.max(
              1,
              container.width,
            )
          ) *
          100
        ).toFixed(2),
      );

    const nextY =
      Number(
        (
          (
            nextTop /
            Math.max(
              1,
              container.height,
            )
          ) *
          100
        ).toFixed(2),
      );

    onPositionChange(
      nextX,
      nextY,
    );
  };

  const finishDrag = (
    event:
      ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (
      dragRef.current
        ?.pointerId ===
      event.pointerId
    ) {
      dragRef.current =
        null;
    }

    if (
      event.currentTarget
        .hasPointerCapture(
          event.pointerId,
        )
    ) {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId,
        );
    }
  };

  const rootWidth =
    compact
      ? size === "small"
        ? "24%"
        : size === "large"
          ? "36%"
          : "30%"
      : scrollable
        ? size === "small"
          ? "42%"
          : size === "large"
            ? "58%"
            : "50%"
        : size === "small"
          ? "min(24%, 220px)"
          : size === "large"
            ? "min(38%, 340px)"
            : "min(32%, 280px)";

  // FLATLIVE_MOBILE_CHAT_VIEWER_TABS_V1
  const [
    activeMobileTab,
    setActiveMobileTab,
  ] = useState<"chat" | "viewers">(
    "chat",
  );

  // FLATLIVE_MOBILE_CHAT_VIEWER_EXTERNAL_EVENT_V1
  useEffect(() => {
    if (!scrollable) {
      return;
    }

    const handleViewerTabOpen = () => {
      setActiveMobileTab("viewers");
    };

    window.addEventListener(
      "flatlive:mobile-viewer-tab-open",
      handleViewerTabOpen,
    );

    return () => {
      window.removeEventListener(
        "flatlive:mobile-viewer-tab-open",
        handleViewerTabOpen,
      );
    };
  }, [scrollable]);

  const [
    mobileManagerViewers,
    setMobileManagerViewers,
  ] = useState<
    Array<{
      viewerId: string;
      userId?: string;
      guestId?: string;
      username?: string;
      nickname?: string;
      avatarUrl?: string;
      isGuest?: boolean;
      isSelf?: boolean;
      isManager?: boolean;
    }>
  >([]);

  const [
    mobileManagerViewersLoading,
    setMobileManagerViewersLoading,
  ] = useState(false);

  useEffect(() => {
    if (!scrollable) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const match =
      window.location.pathname.match(
        /\/live\/watch\/([^/?#]+)/,
      );

    const roomId = match?.[1]
      ? decodeURIComponent(match[1])
      : "";

    if (!roomId) {
      return;
    }

    let cancelled = false;

    const loadViewers = async () => {
      try {
        setMobileManagerViewersLoading(true);

        const response = await fetch(
          `/api/live/manager-viewers?roomId=${encodeURIComponent(roomId)}`,
          {
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (
          !cancelled &&
          response.ok &&
          Array.isArray(data.viewers)
        ) {
          setMobileManagerViewers(data.viewers);
        }
      } catch {
        if (!cancelled) {
          setMobileManagerViewers([]);
        }
      } finally {
        if (!cancelled) {
          setMobileManagerViewersLoading(false);
        }
      }
    };

    void loadViewers();

    const timer = window.setInterval(
      () => {
        void loadViewers();
      },
      1500,
    );

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [scrollable]);

  const visibleMessages =
    scrollable
      ? messages
      : messages.slice(
          -count,
        );

  return (
    <div
      ref={boxRef}
      className={[
        positioning ===
        "absolute"
          ? "absolute"
          : "fixed",

        "z-[40]",
        "FLATLIVE_CHAT_SAFE_ZONE_ONLY_V1",
        "min-w-0",
        "max-w-[calc(100%-8px)]",
        "overflow-visible",
        "rounded-none",
        "bg-transparent",
        "backdrop-blur-0",
        draggable ||
        scrollable
          ? "pointer-events-auto"
          : "pointer-events-none",

        draggable &&
        !scrollable
          ? "cursor-grab select-none active:cursor-grabbing"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left:
          `${displayPosition.left}px`,

        top:
          `${displayPosition.top}px`,

        width:
          rootWidth,

        opacity:
          Math.max(
            0,
            Math.min(
              100,
              opacity,
            ),
          ) /
          100,

        touchAction:
          draggable &&
          !scrollable
            ? "none"
            : "auto",
      }}
      onPointerDown={
        draggable &&
        !scrollable
          ? startDrag
          : undefined
      }
      onPointerMove={
        draggable &&
        !scrollable
          ? moveDrag
          : undefined
      }
      onPointerUp={
        draggable &&
        !scrollable
          ? finishDrag
          : undefined
      }
      onPointerCancel={
        draggable &&
        !scrollable
          ? finishDrag
          : undefined
      }
    >
      {draggable &&
        scrollable && (
          <div
            className="flex h-5 touch-none cursor-grab items-center justify-center active:cursor-grabbing"
            onPointerDown={
              startDrag
            }
            onPointerMove={
              moveDrag
            }
            onPointerUp={
              finishDrag
            }
            onPointerCancel={
              finishDrag
            }
          >
            <div className="h-1 w-9 rounded-full bg-white/35" />
          </div>
        )}

      {false && scrollable && (
        <div
          className="mb-1 flex overflow-hidden rounded-lg border border-white/10 bg-black/55 text-[11px] font-black text-white shadow-lg"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveMobileTab("chat");
            }}
            className={[
              "flex-1 px-2 py-1.5",
              activeMobileTab === "chat"
                ? "bg-yellow-400 text-black"
                : "bg-transparent text-white/75",
            ].join(" ")}
          >
            채팅
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMobileTab("viewers");
            }}
            className={[
              "flex-1 px-2 py-1.5",
              activeMobileTab === "viewers"
                ? "bg-yellow-400 text-black"
                : "bg-transparent text-white/75",
            ].join(" ")}
          >
            시청자
          </button>

          {false && activeMobileTab === "viewers" && (
            <button
              type="button"
              onClick={() => {
                setActiveMobileTab("chat");
              }}
              className="w-8 border-l border-white/10 bg-white/10 text-[13px] font-black text-white"
              aria-label="시청자 목록 닫기"
            >
              ×
            </button>
          )}
        </div>
      )}

      <div
        ref={
          scrollable
            ? listRef
            : undefined
        }
        onScroll={
          scrollable
            ? handleScroll
            : undefined
        }
        className={[
          "px-0 pb-1",
          scrollable
            ? "overscroll-contain overflow-y-auto [&::-webkit-scrollbar]:hidden"
            : "overflow-hidden",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          scrollable
            ? {
                maxHeight:
                  `${
                    rowHeight *
                    count
                  }px`,

                WebkitOverflowScrolling:
                  "touch",

                scrollbarWidth:
                  "none",

                msOverflowStyle:
                  "none",
              }
            : undefined
        }
      >
        {false && activeMobileTab === "viewers" && (
          <div className="space-y-1.5">
            {mobileManagerViewersLoading &&
            mobileManagerViewers.length === 0 ? (
              <div className="rounded-md bg-black/35 px-2 py-2 text-center text-[11px] font-bold text-white/70">
                시청자 불러오는 중...
              </div>
            ) : mobileManagerViewers.length === 0 ? (
              <div className="rounded-md bg-black/35 px-2 py-2 text-center text-[11px] font-bold text-white/70">
                현재 시청자가 없습니다.
              </div>
            ) : (
              mobileManagerViewers.map((viewer) => {
                const displayName =
                  viewer.nickname ||
                  viewer.username ||
                  "게스트";

                return (
                  <div
                    key={viewer.viewerId}
                    className="flex items-center gap-2 rounded-md bg-black/35 px-2 py-1.5 text-white"
                    style={{
                      textShadow:
                        "0 1px 2px rgba(0,0,0,1), 0 0 6px rgba(0,0,0,.85)",
                    }}
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-[9px] font-black text-zinc-300">
                      {viewer.avatarUrl ? (
                        <img
                          src={viewer.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        displayName
                          .slice(0, 1)
                          .toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1">
                        <span className="truncate text-[11px] font-black">
                          {displayName}
                        </span>

                        {viewer.isManager && (
                          <span className="shrink-0 rounded bg-yellow-400/15 px-1 text-[8px] font-black text-yellow-300">
                            매니저
                          </span>
                        )}

                        {viewer.isSelf && (
                          <span className="shrink-0 rounded bg-white/10 px-1 text-[8px] font-black text-zinc-300">
                            나
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 truncate text-[9px] font-bold text-white/50">
                        {viewer.username
                          ? `@${viewer.username}`
                          : viewer.isGuest
                            ? "게스트"
                            : "회원"}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        <div
          className={
            "space-y-1"
          }
        >
          {visibleMessages.map(
            (chat) => {
              const displayName =
                chat.nickname ||
                chat.username ||
                "시청자";

              const isDonation =
                chat.message
                  .startsWith(
                    "🎁 ",
                  );

              // FLATLIVE_MOBILE_CHAT_IDENTITY_RENDER_V1
              const roleIcon =
                chat.nicknameTone === "VIP"
                  ? "👑"
                  : chat.nicknameTone === "FAN"
                    ? "♥"
                    : "";

              const nicknameClass =
                chat.nicknameTone === "BROADCASTER"
                  ? "text-yellow-300"
                  : chat.nicknameTone === "VIP"
                    ? "text-fuchsia-300"
                    : chat.nicknameTone === "FAN"
                      ? "text-amber-300"
                      : "text-white";

              return (
                <div
                  key={
                    chat.id
                  }
                  className={[
                    "min-w-0 max-w-full break-words text-white",

                    chat.isBroadcaster
                      ? "w-fit rounded-md border border-yellow-300/35 bg-black/55 px-2 py-1 shadow-sm"
                      : "",

                    isDonation
                      ? "rounded-md bg-yellow-400/12 px-1.5 py-0.5"
                      : "",

                    size ===
                    "small"
                      ? "text-[9px] leading-[12px]"
                      : "",

                    size ===
                    "medium"
                      ? "text-[10px] leading-[13px]"
                      : "",

                    size ===
                    "large"
                      ? "text-[12px] leading-[15px]"
                      : "",
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(" ")}
                  style={{
                    textShadow:
                      "0 1px 3px rgba(0,0,0,.95)",
                  }}
                >
                  {!chat.isBroadcaster && (
                            <LiveLevelBadge label={chat.levelLabel} />
                          )}

                  {chat.loungeBadge && (
                    <span className="mr-1 rounded bg-black/25 px-1 py-0.5 text-[9px] font-bold text-white/90">
                      {chat.loungeBadge}
                    </span>
                  )}

                  {roleIcon && (
                    <span className="mr-0.5 text-[10px]">
                      {roleIcon}
                    </span>
                  )}

                  {chat.isManager && chat.isBroadcaster === false && (
                    <span className="mr-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-yellow-300/50 bg-yellow-400/15 px-1 text-[9px] font-black leading-none text-yellow-300">
                      M
                    </span>
                  )}

                  {roomId ? (
                    <LiveChatUserMenu
                      mode={actionMode}
                      roomId={roomId}
                      viewerId={chat.viewerId}
                      userId={chat.userId}
                      username={chat.username}
                      nickname={chat.nickname}
                      isBroadcaster={chat.isBroadcaster}
                      isManager={chat.isManager}
                      triggerClassName={[
                        "pointer-events-auto mr-1 inline font-black underline-offset-2 hover:underline",
                        nicknameClass,
                      ].join(" ")}
                    >
                      {displayName}
                    </LiveChatUserMenu>
                  ) : (
                    <strong
                      className={[
                        "mr-1.5 font-extrabold",
                        nicknameClass,
                      ].join(" ")}
                    >
                      {displayName}
                    </strong>
                  )}

                  <span className="break-words text-white/95">
                    {
                      chat.message
                    }
                  </span>
                </div>
              );
            },
          )}
        </div>
      </div>

      {scrollable &&
        showLatestButton && (
          <button
            type="button"
            onClick={() => {
              scrollToLatest();
            }}
            className="pointer-events-auto absolute -bottom-7 left-1/2 flex h-6 min-w-6 -translate-x-1/2 items-center justify-center rounded-full bg-black/75 px-2 text-[11px] font-black text-white shadow-lg"
          >
            ↓
          </button>
        )}
    </div>
  );
}

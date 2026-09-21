"use client";

import WatchManagerControls from "../components/WatchManagerControls";
import LiveChatMuteNotice from "../components/LiveChatMuteNotice";
import { checkAdultLiveAccess } from "../hooks/checkAdultLiveAccess";
import { handleViewerBan } from "../hooks/handleViewerBan";
import {
  closeLiveViewer,
  closeLiveViewerBeacon,
  connectLiveViewer,
  createLiveViewer,
  sendLiveViewerHeartbeat,
} from "../hooks/useLiveViewerConnection";

import ClutchVideoGrid from "@/app/live/match/ClutchVideoGrid";
import useClutchRemoteStreams from "@/app/live/match/useClutchRemoteStreams";
import useClutchRoomMatch from "@/app/live/match/useClutchRoomMatch";
import MobileDraggableChatOverlay from "../../common/MobileDraggableChatOverlay";

import Link from "next/link";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { useParams } from "next/navigation";
import ReportModal from "@/components/ReportModal";
import LiveLevelBadge from "@/app/live/common/LiveLevelBadge";
import LiveChatUserMenu from "@/app/live/common/LiveChatUserMenu";
import TreasureJarOverlay from "@/app/live/common/TreasureJarOverlay";
import TreasureJarGiftPanel from "@/app/live/common/TreasureJarGiftPanel";

// FLATLIVE_TREASURE_JAR_GIFTSHOP_V2_1

type LiveChatMessage = {
  id: string;
  viewerId?: string;
  roomId: string;
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

type DonationEffect = {
  id: string;
  name: string;
  amount: number;
  mediaType: "image" | "video";
  mediaUrl: string;
  durationMs: number;
  enabled: boolean;
};

type ActiveDonationEffect =
  DonationEffect & {
    playbackId: string;
  };

const donationStaticEffectCache =
  new Map<number, DonationEffect | null>();

const donationStaticEffectPending =
  new Map<
    number,
    Promise<DonationEffect | null>
  >();

const donationStaticFrameCache =
  new Map<string, string>();

const donationStaticFramePending =
  new Map<string, Promise<string>>();

function getDonationStaticFrame(
  effect: DonationEffect,
): Promise<string> {
  if (effect.mediaType === "image") {
    return Promise.resolve(
      effect.mediaUrl,
    );
  }

  const cached =
    donationStaticFrameCache.get(
      effect.mediaUrl,
    );

  if (cached) {
    return Promise.resolve(cached);
  }

  const existing =
    donationStaticFramePending.get(
      effect.mediaUrl,
    );

  if (existing) {
    return existing;
  }

  const pending =
    new Promise<string>(
      (resolve, reject) => {
        const video =
          document.createElement(
            "video",
          );

        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";

        const cleanup = () => {
          video.pause();
          video.removeAttribute(
            "src",
          );
          video.load();
        };

        const capture = () => {
          try {
            if (
              !video.videoWidth ||
              !video.videoHeight
            ) {
              reject(
                new Error(
                  "영상 크기를 확인할 수 없습니다.",
                ),
              );
              cleanup();
              return;
            }

            const canvas =
              document.createElement(
                "canvas",
              );

            canvas.width =
              video.videoWidth;

            canvas.height =
              video.videoHeight;

            const context =
              canvas.getContext("2d");

            if (!context) {
              reject(
                new Error(
                  "Canvas context를 만들 수 없습니다.",
                ),
              );
              cleanup();
              return;
            }

            context.drawImage(
              video,
              0,
              0,
              canvas.width,
              canvas.height,
            );

            const imageUrl =
              canvas.toDataURL(
                "image/jpeg",
                0.86,
              );

            donationStaticFrameCache.set(
              effect.mediaUrl,
              imageUrl,
            );

            resolve(imageUrl);
            cleanup();
          } catch (error) {
            reject(error);
            cleanup();
          }
        };

        video.addEventListener(
          "loadedmetadata",
          () => {
            try {
              const targetTime =
                Number.isFinite(
                  video.duration,
                ) &&
                video.duration > 0.2
                  ? 0.1
                  : 0;

              if (targetTime === 0) {
                video.addEventListener(
                  "loadeddata",
                  capture,
                  {
                    once: true,
                  },
                );
              } else {
                video.currentTime =
                  targetTime;
              }
            } catch (error) {
              reject(error);
              cleanup();
            }
          },
          {
            once: true,
          },
        );

        video.addEventListener(
          "seeked",
          capture,
          {
            once: true,
          },
        );

        video.addEventListener(
          "error",
          () => {
            reject(
              new Error(
                "정지 프레임용 영상을 불러오지 못했습니다.",
              ),
            );
            cleanup();
          },
          {
            once: true,
          },
        );

        video.src =
          effect.mediaUrl;

        video.load();
      },
    )
      .finally(() => {
        donationStaticFramePending.delete(
          effect.mediaUrl,
        );
      });

  donationStaticFramePending.set(
    effect.mediaUrl,
    pending,
  );

  return pending;
}

function DonationChatStaticEffect({
  message,
}: {
  message: string;
}) {
  const [imageUrl, setImageUrl] =
    useState("");

  const [effectName, setEffectName] =
    useState("후원 효과");

  useEffect(() => {
    let cancelled = false;

    const match =
      message.match(
        /🎁\s*([\d,]+)\s*FLAT\s*후원했습니다\./,
      );

    if (!match) {
      return;
    }

    const amount =
      Number(
        match[1].replace(/,/g, ""),
      );

    if (
      !Number.isSafeInteger(amount) ||
      amount < 1
    ) {
      return;
    }

    const load = async () => {
      try {
        let effect =
          donationStaticEffectCache.get(
            amount,
          );

        if (effect === undefined) {
          let pending =
            donationStaticEffectPending.get(
              amount,
            );

          if (!pending) {
            pending = fetch(
              `/api/donation-effects?amount=${amount}&effectType=continuous_image`,
              {
                cache: "no-store",
              },
            )
              .then(
                async (response) => {
                  const data =
                    await response.json();

                  if (
                    !response.ok ||
                    !data?.effect?.enabled ||
                    !data.effect.mediaUrl
                  ) {
                    return null;
                  }

                  return data.effect as DonationEffect;
                },
              )
              .then(
                (nextEffect) => {
                  donationStaticEffectCache.set(
                    amount,
                    nextEffect,
                  );

                  return nextEffect;
                },
              )
              .finally(() => {
                donationStaticEffectPending.delete(
                  amount,
                );
              });

            donationStaticEffectPending.set(
              amount,
              pending,
            );
          }

          effect =
            await pending;
        }

        if (
          cancelled ||
          !effect
        ) {
          return;
        }

        const frameUrl =
          await getDonationStaticFrame(
            effect,
          );

        if (cancelled) {
          return;
        }

        setEffectName(
          effect.name ||
            "후원 효과",
        );

        setImageUrl(frameUrl);
      } catch (error) {
        console.error(
          "WATCH DONATION STATIC IMAGE ERROR:",
          error,
        );
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [message]);

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="mt-1.5">
      <img
        src={imageUrl}
        alt={effectName}
        className="max-h-[80px] w-auto max-w-[120px] rounded-lg object-contain"
      />
    </div>
  );
}

export default function WatchLivePage() {
  const params =
    useParams<{ roomId: string }>();

  const roomId = params.roomId;

  // FLATLIVE_CLUTCH_MULTI_GRID_VIEWER_V1
  const {
    match:
      clutchMatch,
  } = useClutchRoomMatch(
    roomId,
  );

  const {
    streams:
      clutchRemoteStreams,
  } = useClutchRemoteStreams({
    match: clutchMatch,
    excludeRoomIds:
      roomId
        ? [roomId]
        : [],
  });


  const videoRef =
    useRef<HTMLVideoElement>(null);

  const peerRef =
    useRef<RTCPeerConnection | null>(null);

  const viewerIdRef =
    useRef("");

  const offerTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null,
    );

  const chatTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null,
    );

  const lastOfferSdpRef =
    useRef("");

  const connectingRef =
    useRef(false);

  const chatBottomRef =
    useRef<HTMLDivElement>(null);

  const [status, setStatus] =
    useState("방송 연결 준비 중...");

  const [error, setError] =
    useState("");

  const [viewerId, setViewerId] =
    useState("");

  const [viewerCount, setViewerCount] =
    useState(0);

  // FLATLIVE_SEPARATE_VIEWER_SHEET_V1
  const [
    mobileViewerSheetOpen,
    setMobileViewerSheetOpen,
  ] = useState(false);

  const [
    mobileViewerSheetLoading,
    setMobileViewerSheetLoading,
  ] = useState(false);

  const [
    mobileViewerSheetList,
    setMobileViewerSheetList,
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

  // FLATLIVE_MANAGER_VIEWERLIST_SYNC_V1
  const [managerViewerAccess, setManagerViewerAccess] =
    useState(false);

  const [managerViewerError, setManagerViewerError] =
    useState("");

  const [pcManagerViewerSheetOpen, setPcManagerViewerSheetOpen] =
    useState(false);

  const [liveStartedAt, setLiveStartedAt] =
    useState(0);

  const [liveTitle, setLiveTitle] =
    useState("LIVE 방송");

  const [liveNow, setLiveNow] =
    useState(Date.now());

  const [chatMessages, setChatMessages] =
    useState<LiveChatMessage[]>([]);

  // FLATLIVE_FORBIDDEN_WORD_PERSISTENT_LOCAL_NOTICE_V3
  const [
    forbiddenWordNotice,
    setForbiddenWordNotice,
  ] = useState<LiveChatMessage | null>(
    null,
  );

  const visibleChatMessages =
    forbiddenWordNotice
      ? [
          ...chatMessages,
          forbiddenWordNotice,
        ].sort(
          (a, b) =>
            a.createdAt - b.createdAt,
        )
      : chatMessages;

  const [
    activeDonationEffect,
    setActiveDonationEffect,
  ] = useState<ActiveDonationEffect | null>(
    null,
  );

  const donationEffectTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const [
    activeDonationEffectChatId,
    setActiveDonationEffectChatId,
  ] = useState("");

  const lastDonationEffectChatIdRef =
    useRef("");

  const donationEffectInitializedRef =
    useRef(false);

  const donationEffectMountedAtRef =
    useRef(Date.now());

  const [chatInput, setChatInput] =
    useState("");

  const [chatSending, setChatSending] =
    useState(false);

  // FLATLIVE_LIVE_LIKE_CHAT_STATE
  const [liveLikeSending, setLiveLikeSending] =
    useState(false);

  const [liveLiked, setLiveLiked] =
    useState(false);

  const [chatError, setChatError] =
    useState("");

  // FLATLIVE_CHAT_MUTE_INPUT_LOCK_V2
  const [
    viewerChatMuted,
    setViewerChatMuted,
  ] = useState(false);

  useEffect(() => {
    if (!viewerChatMuted) {
      return;
    }

    setChatOpen(false);
    setChatInput("");
    setChatError("");
  }, [viewerChatMuted]);

  const [chatOpen, setChatOpen] =
    useState(false);

  const [pcChatOpen, setPcChatOpen] =
    useState(true);

  // FLATLIVE_VIEWER_CHAT_OVERLAY_SYNC_STATE
  const [
    viewerChatOverlayEnabled,
    setViewerChatOverlayEnabled,
  ] = useState(true);

  const [
    viewerChatOverlayPosition,
    setViewerChatOverlayPosition,
  ] = useState<
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
  >("bottom-left");

  const [
    viewerChatOverlaySize,
    setViewerChatOverlaySize,
  ] = useState<
    | "small"
    | "medium"
    | "large"
  >("medium");

  const [
    viewerChatOverlayCount,
    setViewerChatOverlayCount,
  ] = useState<3 | 5 | 10>(5);

  const [
    viewerChatOverlayOpacity,
    setViewerChatOverlayOpacity,
  ] = useState<50 | 70 | 90>(70);

  // FLATLIVE_VIEWER_CHAT_OVERLAY_XY_STATE
  const [
    viewerChatOverlayX,
    setViewerChatOverlayX,
  ] = useState(8);

  const [
    viewerChatOverlayY,
    setViewerChatOverlayY,
  ] = useState(72);

  const [
    videoContentRect,
    setVideoContentRect,
  ] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const [mobileLiveInfoVisible, setMobileLiveInfoVisible] =
    useState(true);

  const [reportOpen, setReportOpen] =
    useState(false);

  const [broadcasterUserId, setBroadcasterUserId] =
    useState("");

  const [broadcasterName, setBroadcasterName] =
    useState("FLATIST");

  const [broadcasterLevel, setBroadcasterLevel] =
    useState(1);

  const [broadcasterUsername, setBroadcasterUsername] =
    useState("");

  const [broadcasterAvatarUrl, setBroadcasterAvatarUrl] =
    useState("");

  const [following, setFollowing] =
    useState(false);

  const [followerCount, setFollowerCount] =
    useState(0);

  const [followBusy, setFollowBusy] =
    useState(false);

  // FLATLIVE_FAN_JOIN_MODAL_V1
  const [fanJoinTier, setFanJoinTier] =
    useState<"FAN" | "VIP" | null>(null);

  const [fanJoinLoading, setFanJoinLoading] =
    useState(false);

  const [fanJoinBusy, setFanJoinBusy] =
    useState(false);

  const [fanJoinMessage, setFanJoinMessage] =
    useState("");

  const [fanJoinData, setFanJoinData] =
    useState<{
      balance: number;
      membership: {
        tier: "FAN" | "VIP";
        status: string;
        expiresAt: number | null;
      } | null;
      settings: {
        fanEnabled: boolean;
        fanMessage: string;
        fanPriceFlat: number;
        fanDurationType: "THIRTY_DAYS" | "PERMANENT";
        vipEnabled: boolean;
        vipMessage: string;
        vipImageUrl: string;
        vipPriceFlat: number;
        vipDurationType: "THIRTY_DAYS" | "PERMANENT";
      };
    } | null>(null);

  const [donationOpen, setDonationOpen] =
    useState(false);

  const [donationAmount, setDonationAmount] =
    useState(100);

  const [donationBusy, setDonationBusy] =
    useState(false);

  const [donationMessage, setDonationMessage] =
    useState("");

  const [donationTraceId, setDonationTraceId] =
    useState("");

  const [donationBalance, setDonationBalance] =
    useState<number | null>(null);

  const [
    donationBalanceLoading,
    setDonationBalanceLoading,
  ] = useState(false);

  const [autoDonationMode, setAutoDonationMode] =
    useState<"single" | "repeat" | "sequence" | "special">("single");

  const [autoRepeatAmount, setAutoRepeatAmount] =
    useState("100");

  const [autoRepeatCount, setAutoRepeatCount] =
    useState("5");

  const [autoSequenceStart, setAutoSequenceStart] =
    useState("1");

  const [autoSequenceEnd, setAutoSequenceEnd] =
    useState("100");

  const [autoSequenceStep, setAutoSequenceStep] =
    useState("1");

  const [autoDonationInterval, setAutoDonationInterval] =
    useState(1);

  const [autoDonationRunning, setAutoDonationRunning] =
    useState(false);

  const [autoDonationProgress, setAutoDonationProgress] =
    useState("");

  const autoDonationStopRef =
    useRef(false);

  const donationRequestBusyRef =
    useRef(false);

  /*
   * LIVE 방을 벗어나거나 페이지가 종료되면
   * 반복/순차 자동 선물의 다음 전송을 중지한다.
   *
   * 선물창만 닫는 경우에는 중지하지 않는다.
   */
  useEffect(() => {
    const stopAutoDonationOnLeave = () => {
      autoDonationStopRef.current = true;
    };

    window.addEventListener(
      "pagehide",
      stopAutoDonationOnLeave,
    );

    window.addEventListener(
      "beforeunload",
      stopAutoDonationOnLeave,
    );

    return () => {
      autoDonationStopRef.current = true;

      window.removeEventListener(
        "pagehide",
        stopAutoDonationOnLeave,
      );

      window.removeEventListener(
        "beforeunload",
        stopAutoDonationOnLeave,
      );
    };
  }, []);

  const [volume, setVolume] =
    useState(1);

  const [muted, setMuted] =
    useState(true);

  const [soundPromptVisible, setSoundPromptVisible] =
    useState(true);

  const [volumeOpen, setVolumeOpen] =
    useState(false);
  const [speakerControlsVisible, setSpeakerControlsVisible] =
    useState(false);

  const [keyboardInset, setKeyboardInset] =
    useState(0);

  const [keyboardTop, setKeyboardTop] =
    useState<number | null>(null);

  const chatInputRef =
    useRef<HTMLInputElement>(null);

  const chatScrollRef =
    useRef<HTMLDivElement>(null);

  const chatPinnedToBottomRef =
    useRef(true);

  const [mobileChatVisible, setMobileChatVisible] =
    useState(true);

  const [
    showLatestChatButton,
    setShowLatestChatButton,
  ] = useState(false);

  // FLATLIVE_CHAT_UX_V2_LATEST_COUNT
  const [
    latestChatCount,
    setLatestChatCount,
  ] = useState(0);

  const previousChatCountRef =
    useRef(0);

  const chatInitializedRef =
    useRef(false);

  const [
    remoteVideoAspectRatio,
    setRemoteVideoAspectRatio,
  ] = useState<number | null>(null);

  const isLandscapeRemoteVideo =
    remoteVideoAspectRatio !== null &&
    remoteVideoAspectRatio > 1;

  // FLATLIVE_MOBILE_VIEWER_CHAT_PANEL_V1
  const [
    mobileViewerChatHidden,
    setMobileViewerChatHidden,
  ] = useState(false);

  // FLATLIVE_CHAT_UX_V2_SCROLL_CONTROL
  function handleChatScroll() {
    const element =
      chatScrollRef.current;

    if (!element) {
      return;
    }

    const distanceFromBottom =
      element.scrollHeight -
      element.scrollTop -
      element.clientHeight;

    const pinned =
      distanceFromBottom < 80;

    chatPinnedToBottomRef.current =
      pinned;

    if (pinned) {
      setShowLatestChatButton(false);
      setLatestChatCount(0);
    }
  }

  function goToLatestChat() {
    const element =
      chatScrollRef.current;

    if (!element) {
      return;
    }

    element.scrollTo({
      top: element.scrollHeight,
      behavior: "smooth",
    });

    chatPinnedToBottomRef.current =
      true;

    setShowLatestChatButton(false);
    setLatestChatCount(0);
  }

  useEffect(() => {
    const currentCount =
      chatMessages.length;

    if (!chatInitializedRef.current) {
      chatInitializedRef.current =
        true;

      previousChatCountRef.current =
        currentCount;

      window.requestAnimationFrame(
        () => {
          const element =
            chatScrollRef.current;

          if (element) {
            element.scrollTop =
              element.scrollHeight;
          }
        },
      );

      return;
    }

    const addedCount =
      Math.max(
        0,
        currentCount -
          previousChatCountRef.current,
      );

    previousChatCountRef.current =
      currentCount;

    if (addedCount === 0) {
      return;
    }

    if (
      chatPinnedToBottomRef.current
    ) {
      window.requestAnimationFrame(
        () => {
          const element =
            chatScrollRef.current;

          if (element) {
            element.scrollTo({
              top:
                element.scrollHeight,
              behavior: "smooth",
            });
          }
        },
      );

      return;
    }

    setLatestChatCount(
      (count) =>
        count + addedCount,
    );

    setShowLatestChatButton(true);
  }, [chatMessages.length]);

  useEffect(() => {
    if (!mobileLiveInfoVisible) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        setMobileLiveInfoVisible(false);
      }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mobileLiveInfoVisible]);

  // FLATLIVE_LIVE_LIKE_CHAT_HANDLER
  async function handleLiveLike() {
    if (
      !roomId ||
      liveLikeSending ||
      liveLiked
    ) {
      return;
    }

    try {
      setLiveLikeSending(true);
      setChatError("");

      const response =
        await fetch(
          "/api/live/recommend",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              roomId,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        const details = [
          data.error,
          data.errorCode,
          data.traceId,
        ]
          .filter(Boolean)
          .join(" · ");

        setChatError(
          details ||
            "좋아요 처리에 실패했습니다.",
        );

        console.error(
          "LIVE LIKE CHAT FAILED:",
          {
            roomId,
            errorCode:
              data.errorCode,
            traceId:
              data.traceId,
            error:
              data.error,
          },
        );

        return;
      }

      setLiveLiked(true);

      if (data.message) {
        setChatMessages(
          (previous) => {
            if (
              previous.some(
                (item) =>
                  item.id ===
                  data.message.id,
              )
            ) {
              return previous;
            }

            return [
              ...previous,
              data.message,
            ];
          },
        );
      }
    } catch (error) {
      console.error(
        "LIVE LIKE CHAT ERROR:",
        error,
      );

      setChatError(
        "좋아요 처리 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      setLiveLikeSending(false);
    }
  }

  async function handleLiveShare() {
    const url =
      window.location.href;

    try {
      if (
        typeof navigator.share ===
        "function"
      ) {
        await navigator.share({
          title:
            "FLATLIVE LIVE",
          text:
            "현재 LIVE 방송을 공유합니다.",
          url,
        });

        return;
      }

      await navigator.clipboard.writeText(
        url,
      );

      alert(
        "LIVE 방송 링크가 복사되었습니다.",
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        (
          error.name === "AbortError" ||
          error.name === "InvalidStateError"
        )
      ) {
        return;
      }

      console.error(
        "LIVE SHARE ERROR",
        error,
      );

      try {
        await navigator.clipboard.writeText(
          url,
        );

        alert(
          "LIVE 방송 링크가 복사되었습니다.",
        );
      } catch {
        alert(
          "공유에 실패했습니다.",
        );
      }
    }
  }

  async function showDonationEffectFromMessage(
    message: string,
    chatId: string,
  ) {
    try {
      const match =
        message.match(
          /🎁\s*([\d,]+)\s*FLAT\s*후원했습니다\./,
        );

      if (!match) {
        return;
      }

      const amount =
        Number(
          match[1].replace(
            /,/g,
            "",
          ),
        );

      if (
        !Number.isSafeInteger(amount) ||
        amount < 1
      ) {
        return;
      }

      const response =
        await fetch(
          `/api/donation-effects?amount=${amount}&effectType=single_video`,
          {
            cache: "no-store",
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.effect
      ) {
        return;
      }

      const effect =
        data.effect as DonationEffect;

      if (
        !effect.enabled ||
        !effect.mediaUrl
      ) {
        return;
      }

      if (
        donationEffectTimerRef.current
      ) {
        clearTimeout(
          donationEffectTimerRef.current,
        );
      }

      setActiveDonationEffect({
        ...effect,
        playbackId:
          `${effect.id}-${Date.now()}`,
      });

      setActiveDonationEffectChatId(
        chatId,
      );


    } catch (error) {
      console.error(
        "WATCH DONATION EFFECT ERROR:",
        error,
      );
    }
  }

  useEffect(() => {
    const latestGift =
      [...chatMessages]
        .reverse()
        .find(
          (message) =>
            typeof message.message ===
              "string" &&
            message.message.startsWith(
              "🎁 ",
            ) &&
            message.message.includes(
              "FLAT 후원했습니다.",
            ) &&
            (!message.donationMode ||
              message.donationMode === "single") &&
            message.createdAt >=
              donationEffectMountedAtRef.current,
        );

    /*
     * 첫 채팅 상태를 기준점으로만 저장한다.
     * 처음에 후원 내역이 0건이어도 초기화 완료 처리해서
     * 이후 들어오는 첫 실제 후원부터 이펙트를 표시한다.
     */
    if (
      !donationEffectInitializedRef.current
    ) {
      donationEffectInitializedRef.current =
        true;

      if (latestGift) {
        lastDonationEffectChatIdRef.current =
          latestGift.id;
      }

      return;
    }

    if (!latestGift) {
      return;
    }

    if (
      latestGift.id ===
      lastDonationEffectChatIdRef.current
    ) {
      return;
    }

    lastDonationEffectChatIdRef.current =
      latestGift.id;

    void showDonationEffectFromMessage(
      latestGift.message,
      latestGift.id,
    );
  }, [chatMessages]);

  useEffect(() => {
    return () => {
      if (
        donationEffectTimerRef.current
      ) {
        clearTimeout(
          donationEffectTimerRef.current,
        );
      }
    };
  }, []);

  function openMobileViewerTab() {
    setMobileViewerSheetOpen(true);
    void loadMobileViewerSheet();
  }


  async function loadMobileViewerSheet() {
    if (!roomId) {
      return;
    }

    try {
      setMobileViewerSheetLoading(true);
      setManagerViewerError("");

      // FLATLIVE_MANAGER_VIEWERLIST_SYNC_V1
      const permissionResponse = await fetch(
        `/api/live/managers?roomId=${encodeURIComponent(roomId)}`,
        { cache: "no-store" },
      );

      const permissionData = await permissionResponse
        .json()
        .catch(() => ({}));

      const canModerate =
        permissionResponse.ok &&
        permissionData?.canModerate === true;

      setManagerViewerAccess(canModerate);

      if (!canModerate) {
        setManagerViewerAccess(false);
        setMobileViewerSheetList([]);
        setMobileViewerSheetOpen(false);
        setPcManagerViewerSheetOpen(false);
        setManagerViewerError("");
        return;
      }

      const response = await fetch(
        `/api/live/manager-viewers?roomId=${encodeURIComponent(roomId)}`,
        { cache: "no-store" },
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (response.ok && Array.isArray(data.viewers)) {
        let nextViewers = data.viewers;

        if (nextViewers.length === 0 && viewerCount > 0) {
          const signalResponse = await fetch(
            `/api/live/signal?roomId=${encodeURIComponent(roomId)}`,
            { cache: "no-store" },
          );

          const signalData = await signalResponse
            .json()
            .catch(() => ({}));

          if (
            signalResponse.ok &&
            Array.isArray(signalData.viewers)
          ) {
            nextViewers = signalData.viewers;
          }
        }

        setMobileViewerSheetList(nextViewers);
      } else {
        setMobileViewerSheetList([]);
        setManagerViewerError(
          data?.error ||
            `시청자 목록을 불러오지 못했습니다. (${response.status})`,
        );
      }
    } catch (error) {
      console.error(
        "MOBILE_VIEWER_SHEET_FAILED",
        error,
      );

      setMobileViewerSheetList([]);
      setManagerViewerError(
        "시청자 목록 연결에 실패했습니다.",
      );
    } finally {
      setMobileViewerSheetLoading(false);
    }
  }

  function openMobileViewerSheet() {
    setMobileViewerSheetOpen(true);
    void loadMobileViewerSheet();
  }

  function closeMobileViewerSheet() {
    setMobileViewerSheetOpen(false);
  }

  useEffect(() => {
    if (!mobileViewerSheetOpen) {
      return;
    }

    void loadMobileViewerSheet();

    const timer = window.setInterval(
      () => {
        void loadMobileViewerSheet();
      },
      1500,
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [
    mobileViewerSheetOpen,
    roomId,
  ]);

  // FLATLIVE_MANAGER_VIEWERLIST_SYNC_V2
  // 매니저 권한과 시청자 목록은 같은 API를 기준으로 판정한다.
  // 권한이 해제되면 모바일/PC 목록 창도 즉시 닫는다.
  useEffect(() => {
    if (!roomId) {
      setManagerViewerAccess(false);
      setMobileViewerSheetOpen(false);
      setPcManagerViewerSheetOpen(false);
      setMobileViewerSheetList([]);
      return;
    }

    let cancelled = false;

    const syncManagerViewerAccess = async () => {
      try {
        const response = await fetch(
          `/api/live/manager-viewers?roomId=${encodeURIComponent(roomId)}`,
          { cache: "no-store" },
        );
        const data = await response.json().catch(() => ({}));

        if (cancelled) {
          return;
        }

        const allowed = response.ok && Array.isArray(data?.viewers);
        setManagerViewerAccess(allowed);

        if (allowed) {
          setManagerViewerError("");
          setMobileViewerSheetList(data.viewers);
        } else {
          setMobileViewerSheetOpen(false);
          setPcManagerViewerSheetOpen(false);
          setMobileViewerSheetList([]);
          setManagerViewerError("");
        }
      } catch {
        if (!cancelled) {
          setManagerViewerAccess(false);
          setMobileViewerSheetOpen(false);
          setPcManagerViewerSheetOpen(false);
          setMobileViewerSheetList([]);
        }
      }
    };

    void syncManagerViewerAccess();

    const timer = window.setInterval(() => {
      void syncManagerViewerAccess();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [roomId]);

  useEffect(() => {
    if (!pcManagerViewerSheetOpen) {
      return;
    }

    void loadMobileViewerSheet();

    const timer = window.setInterval(() => {
      void loadMobileViewerSheet();
    }, 1500);

    return () => window.clearInterval(timer);
  }, [pcManagerViewerSheetOpen, roomId, viewerCount]);

  function openChatInput() {
    const mobileNav =
      document.querySelector<HTMLElement>(
        '[data-flat-mobile-nav="true"]',
      );

    if (mobileNav) {
      mobileNav.style.display = "none";
    }

    flushSync(() => {
      setChatOpen(true);
    });

    chatInputRef.current?.focus();
  }

  function toggleMute() {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    video.muted =
      !video.muted;

    setMuted(video.muted);
  }

  async function enableSound() {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    try {
      video.muted = false;

      if (video.volume === 0) {
        video.volume = 1;
        setVolume(1);
      }

      await video.play();

      setMuted(false);
      setSoundPromptVisible(false);
    } catch (error) {
      video.muted = true;
      setMuted(true);

      console.warn(
        "ENABLE SOUND FAILED:",
        error,
      );
    }
  }

  function changeVolume(
    nextVolume: number,
  ) {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    video.volume =
      nextVolume;

    video.muted =
      nextVolume === 0;

    setVolume(nextVolume);
    setMuted(nextVolume === 0);
  }

  useEffect(() => {
    const viewport =
      window.visualViewport;

    if (!viewport) {
      return;
    }

    const updateKeyboardInset = () => {
      const inset = Math.max(
        0,
        window.innerHeight -
          viewport.height -
          viewport.offsetTop,
      );

      setKeyboardInset(inset);

      setKeyboardTop(
        viewport.offsetTop + viewport.height,
      );

      const mobileNav =
        document.querySelector<HTMLElement>(
          '[data-flat-mobile-nav="true"]',
        );

      if (mobileNav) {
        mobileNav.style.display =
          inset > 40 ? "none" : "";
      }
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

    return () => {
      viewport.removeEventListener(
        "resize",
        updateKeyboardInset,
      );

      viewport.removeEventListener(
        "scroll",
        updateKeyboardInset,
      );

      const mobileNav =
        document.querySelector<HTMLElement>(
          '[data-flat-mobile-nav="true"]',
        );

      if (mobileNav) {
        mobileNav.style.display = "";
      }
    };
  }, []);

  // FLATLIVE_VIEWER_VIDEO_CONTENT_RECT
  useEffect(() => {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    const parent =
      video.parentElement;

    if (!parent) {
      return;
    }

    const measure = () => {
      const activeVideo =
        videoRef.current;

      if (
        !activeVideo ||
        activeVideo.videoWidth <= 0 ||
        activeVideo.videoHeight <= 0
      ) {
        return;
      }

      const videoBox =
        activeVideo.getBoundingClientRect();

      const parentBox =
        parent.getBoundingClientRect();

      const scale =
        Math.min(
          videoBox.width /
            activeVideo.videoWidth,
          videoBox.height /
            activeVideo.videoHeight,
        );

      const width =
        activeVideo.videoWidth *
        scale;

      const height =
        activeVideo.videoHeight *
        scale;

      const desktop =
        window.matchMedia(
          "(min-width: 768px)",
        ).matches;

      const left =
        videoBox.left -
        parentBox.left +
        (videoBox.width - width) /
          2;

      const top =
        videoBox.top -
        parentBox.top +
        (desktop
          ? (
              videoBox.height -
              height
            ) / 2
          : 0);

      setVideoContentRect({
        left,
        top,
        width,
        height,
      });
    };

    measure();

    window.addEventListener(
      "resize",
      measure,
    );

    const observer =
      new ResizeObserver(
        measure,
      );

    observer.observe(video);
    observer.observe(parent);

    const timer =
      window.setInterval(
        measure,
        1000,
      );

    return () => {
      window.removeEventListener(
        "resize",
        measure,
      );

      observer.disconnect();

      window.clearInterval(
        timer,
      );
    };
  }, [
    remoteVideoAspectRatio,
    pcChatOpen,
  ]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    let lastVideoTime = video.currentTime;
    let lastProgressAt = Date.now();

    const timer = window.setInterval(() => {
      const activeVideo = videoRef.current;

      if (
        !activeVideo ||
        !activeVideo.srcObject
      ) {
        lastProgressAt = Date.now();
        return;
      }

      const currentVideoTime =
        activeVideo.currentTime;

      const progressed =
        currentVideoTime >
        lastVideoTime + 0.05;

      if (progressed) {
        lastVideoTime =
          currentVideoTime;

        lastProgressAt =
          Date.now();

        if (
          status ===
          "방송 다시 연결 기다리는 중..."
        ) {
          console.log(
            "VIEWER VIDEO RESUMED",
          );

          setStatus("● LIVE");
          setError("");
        }

        return;
      }

      if (
        status === "● LIVE" &&
        Date.now() - lastProgressAt >=
          5000
      ) {
        console.log(
          "VIEWER VIDEO FREEZE DETECTED",
          {
            currentTime:
              currentVideoTime,
          },
        );

        setStatus(
          "방송 다시 연결 기다리는 중...",
        );

        setError("");
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [status]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled = false;

    const checkRoomExists = async () => {
      try {
        const response = await fetch(
          `/api/live/signal?roomId=${encodeURIComponent(
            roomId,
          )}`,
          {
            cache: "no-store",
          },
        );

        if (cancelled) {
          return;
        }

        if (response.ok) {
          const roomData =
            await response.json();

          setViewerChatOverlayEnabled(
            roomData.chatOverlayEnabled !==
              false,
          );

          setViewerChatOverlayPosition(
            [
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
            ].includes(
              roomData.chatOverlayPosition,
            )
              ? roomData.chatOverlayPosition
              : "bottom-left",
          );

          setViewerChatOverlaySize(
            [
              "small",
              "medium",
              "large",
            ].includes(
              roomData.chatOverlaySize,
            )
              ? roomData.chatOverlaySize
              : "medium",
          );

          setViewerChatOverlayCount(
            [3, 5, 10].includes(
              roomData.chatOverlayCount,
            )
              ? roomData.chatOverlayCount
              : 5,
          );

          setViewerChatOverlayOpacity(
            [50, 70, 90].includes(
              roomData.chatOverlayOpacity,
            )
              ? roomData.chatOverlayOpacity
              : 70,
          );

          // FLATLIVE_VIEWER_CHAT_XY_ROOM_SYNC
          if (
            typeof roomData.chatOverlayX ===
              "number" &&
            Number.isFinite(
              roomData.chatOverlayX,
            )
          ) {
            setViewerChatOverlayX(
              Math.max(
                0,
                Math.min(
                  100,
                  roomData.chatOverlayX,
                ),
              ),
            );
          }

          if (
            typeof roomData.chatOverlayY ===
              "number" &&
            Number.isFinite(
              roomData.chatOverlayY,
            )
          ) {
            setViewerChatOverlayY(
              Math.max(
                0,
                Math.min(
                  100,
                  roomData.chatOverlayY,
                ),
              ),
            );
          }

          const broadcasterHeartbeatAt =
            typeof roomData.broadcasterHeartbeatAt ===
            "number"
              ? roomData.broadcasterHeartbeatAt
              : 0;

          if (
            broadcasterHeartbeatAt > 0 &&
            Date.now() -
              broadcasterHeartbeatAt >=
              10000
          ) {
            setError("");

            setStatus(
              "방송 다시 연결 기다리는 중...",
            );

            return;
          }

          if (
            broadcasterHeartbeatAt > 0 &&
            status ===
              "방송 다시 연결 기다리는 중..."
          ) {
            setStatus("● LIVE");
            setError("");
          }

          return;
        }

        if (response.status !== 404) {
          return;
        }

        console.log(
          "LIVE ROOM GONE:",
          roomId,
        );

        if (offerTimerRef.current) {
          clearInterval(
            offerTimerRef.current,
          );

          offerTimerRef.current = null;
        }

        const peer =
          peerRef.current;

        if (peer) {
          peer.ontrack = null;
          peer.oniceconnectionstatechange =
            null;
          peer.onconnectionstatechange =
            null;
          peer.onicecandidateerror =
            null;

          peer.close();
          peerRef.current = null;
        }

        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.srcObject =
            null;
        }

        setError("");
        setStatus(
          "방송이 종료되었습니다.",
        );
      } catch (error) {
        // 서버가 잠깐 꺼져 있거나 네트워크가 끊긴 경우에는
        // 방송 종료로 확정하지 않고 재연결을 기다린다.
        console.warn(
          "LIVE ROOM CHECK WAITING:",
          error,
        );
      }
    };

    void checkRoomExists();

    const timer =
      window.setInterval(() => {
        void checkRoomExists();
      }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [roomId]);

  const [liveIsAdult, setLiveIsAdult] =
    useState(false);

  const [
    adultLiveAccess,
    setAdultLiveAccess,
  ] = useState<
    "checking" |
    "allowed" |
    "login-required" |
    "verification-required" |
    "error"
  >("checking");

  async function loadBroadcasterInfo() {
    try {
      const roomResponse =
        await fetch(
          `/api/live/signal?roomId=${encodeURIComponent(
            roomId,
          )}`,
          {
            cache: "no-store",
          },
        );

      if (!roomResponse.ok) {
        return;
      }

      const roomData =
        await roomResponse.json();

      const userId =
        typeof roomData.broadcasterUserId ===
        "string"
          ? roomData.broadcasterUserId
          : "";

      const name =
        typeof roomData.broadcasterName ===
        "string"
          ? roomData.broadcasterName
          : "FLATIST";

      const username =
        typeof roomData.broadcasterUsername ===
        "string"
          ? roomData.broadcasterUsername
          : "";

      const avatarUrl =
        typeof roomData.broadcasterAvatarUrl ===
        "string"
          ? roomData.broadcasterAvatarUrl
          : "";

      setBroadcasterUserId(userId);
      setBroadcasterName(name);
      setBroadcasterUsername(username);
      setBroadcasterAvatarUrl(avatarUrl);

      try {
        const levelsResponse =
          await fetch("/api/live/rooms", {
            cache: "no-store",
          });

        if (levelsResponse.ok) {
          const levelsData =
            await levelsResponse.json();

          const currentRoom =
            Array.isArray(levelsData.rooms)
              ? levelsData.rooms.find(
                  (item: {
                    roomId?: string;
                    broadcasterLevel?: number;
                  }) =>
                    item.roomId === roomId,
                )
              : null;

          const level =
            Number(
              currentRoom?.broadcasterLevel,
            );

          if (
            Number.isFinite(level) &&
            level >= 1
          ) {
            setBroadcasterLevel(
              Math.floor(level),
            );
          }
        }
      } catch (error) {
        console.warn(
          "VIEWER_CREATOR_LEVEL_LOAD_FAILED",
          error,
        );
      }

      setLiveIsAdult(
        roomData.isAdult === true,
      );

      setViewerChatOverlayEnabled(
        roomData.chatOverlayEnabled !==
          false,
      );

      setViewerChatOverlayPosition(
        [
          "top-left",
          "top-right",
          "bottom-left",
          "bottom-right",
        ].includes(
          roomData.chatOverlayPosition,
        )
          ? roomData.chatOverlayPosition
          : "bottom-left",
      );

      setViewerChatOverlaySize(
        [
          "small",
          "medium",
          "large",
        ].includes(
          roomData.chatOverlaySize,
        )
          ? roomData.chatOverlaySize
          : "medium",
      );

      setViewerChatOverlayCount(
        [3, 5, 10].includes(
          roomData.chatOverlayCount,
        )
          ? roomData.chatOverlayCount
          : 5,
      );

      setViewerChatOverlayOpacity(
        [50, 70, 90].includes(
          roomData.chatOverlayOpacity,
        )
          ? roomData.chatOverlayOpacity
          : 70,
      );

      if (!userId) {
        return;
      }

      const followResponse =
        await fetch(
          `/api/social/follow?targetUserId=${encodeURIComponent(
            userId,
          )}`,
          {
            cache: "no-store",
          },
        );

      if (!followResponse.ok) {
        return;
      }

      const followData =
        await followResponse.json();

      setFollowing(
        Boolean(
          followData.following,
        ),
      );

      if (
        typeof followData.followers ===
        "number"
      ) {
        setFollowerCount(
          followData.followers,
        );
      }
    } catch (error) {
      console.error(
        "BROADCASTER INFO FAILED:",
        error,
      );
    }
  }

  async function openFanJoin(
    tier: "FAN" | "VIP",
  ) {
    if (!broadcasterUserId) {
      alert("방송자 정보를 불러오는 중입니다.");
      return;
    }

    try {
      setFanJoinTier(tier);
      setFanJoinData(null);
      setFanJoinMessage("");
      setFanJoinLoading(true);

      const response = await fetch(
        `/api/live/fan-membership?broadcasterUserId=${encodeURIComponent(
          broadcasterUserId,
        )}`,
        { cache: "no-store" },
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setFanJoinTier(null);
          alert("로그인 후 팬가입할 수 있습니다.");
          return;
        }

        throw new Error(
          data.message ||
            "팬가입 정보를 불러오지 못했습니다.",
        );
      }

      const enabled =
        tier === "VIP"
          ? data.settings?.vipEnabled
          : data.settings?.fanEnabled;

      if (!enabled) {
        setFanJoinTier(null);
        alert(
          tier === "VIP"
            ? "현재 VIP 팬가입을 받고 있지 않습니다."
            : "현재 팬가입을 받고 있지 않습니다.",
        );
        return;
      }

      setFanJoinData({
        balance:
          typeof data.balance === "number"
            ? data.balance
            : 0,
        membership: data.membership ?? null,
        settings: data.settings,
      });
    } catch (error) {
      console.error(
        "FAN MEMBERSHIP LOAD FAILED:",
        error,
      );

      setFanJoinTier(null);

      alert(
        error instanceof Error
          ? error.message
          : "팬가입 정보를 불러오지 못했습니다.",
      );
    } finally {
      setFanJoinLoading(false);
    }
  }

  async function purchaseFanMembership() {
    if (
      !fanJoinTier ||
      !broadcasterUserId ||
      !fanJoinData ||
      fanJoinBusy
    ) {
      return;
    }

    try {
      setFanJoinBusy(true);
      setFanJoinMessage("");

      const response = await fetch(
        "/api/live/fan-membership",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            broadcasterUserId,
            tier: fanJoinTier,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (
          data.error ===
          "FAN_MEMBERSHIP_INSUFFICIENT_BALANCE"
        ) {
          setFanJoinData((current) =>
            current
              ? {
                  ...current,
                  balance:
                    typeof data.balance === "number"
                      ? data.balance
                      : current.balance,
                }
              : current,
          );
        }

        throw new Error(
          data.message ||
            "팬가입 처리에 실패했습니다.",
        );
      }

      setFanJoinData((current) =>
        current
          ? {
              ...current,
              balance:
                typeof data.balance === "number"
                  ? data.balance
                  : current.balance,
              membership:
                data.membership ??
                current.membership,
            }
          : current,
      );

      setFanJoinMessage(
        data.message ||
          (fanJoinTier === "VIP"
            ? "VIP 팬가입이 완료됐습니다. 👑"
            : "팬가입이 완료됐습니다. 💛"),
      );
    } catch (error) {
      console.error(
        "FAN MEMBERSHIP PURCHASE FAILED:",
        error,
      );

      setFanJoinMessage(
        error instanceof Error
          ? error.message
          : "팬가입 처리에 실패했습니다.",
      );
    } finally {
      setFanJoinBusy(false);
    }
  }

  async function toggleFollow() {
    if (followBusy) {
      return;
    }

    if (!broadcasterUserId) {
      alert("방송자 ID를 불러오지 못했습니다.");
      return;
    }

    try {
      setFollowBusy(true);

      const response =
        await fetch(
          "/api/social/follow",
          {
            method:
              following
                ? "DELETE"
                : "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              targetUserId:
                broadcasterUserId,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        if (
          response.status === 401
        ) {
          alert(
            "로그인 후 팔로우할 수 있습니다.",
          );
          return;
        }

        throw new Error(
          data.error ||
            "팔로우 처리에 실패했습니다.",
        );
      }

      setFollowing(
        Boolean(
          data.following,
        ),
      );

      if (
        typeof data.followers ===
        "number"
      ) {
        setFollowerCount(
          data.followers,
        );
      }
    } catch (error) {
      console.error(
        "FOLLOW TOGGLE FAILED:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "팔로우 처리에 실패했습니다.",
      );
    } finally {
      setFollowBusy(false);
    }
  }

  async function loadDonationBalance() {
    try {
      setDonationBalanceLoading(true);

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
        setDonationBalance(null);
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

      let nextBalance: number | null =
        null;

      for (const candidate of candidates) {
        const parsed =
          typeof candidate === "number"
            ? candidate
            : Number(candidate);

        if (Number.isFinite(parsed)) {
          nextBalance = parsed;
          break;
        }
      }

      setDonationBalance(nextBalance);
    } catch (error) {
      console.error(
        "DONATION BALANCE LOAD FAILED:",
        error,
      );

      setDonationBalance(null);
    } finally {
      setDonationBalanceLoading(false);
    }
  }

  function openDonation() {
    if (!broadcasterUserId) {
      alert("방송자 정보를 불러오는 중입니다.");
      return;
    }

    setDonationMessage("");
    setDonationTraceId("");

    void loadDonationBalance();

    setDonationOpen(true);
  }

    async function sendDonationChatMessage(
    amount: number,
    donationMode: "single" | "repeat" | "sequence",
  ) {
    try {
      const response =
        await fetch(
          "/api/live/chat",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              roomId,
              message:
                `🎁 ${amount.toLocaleString()} FLAT 후원했습니다.`,
              donationMode,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          "DONATION CHAT FAILED:",
          {
            roomId,
            errorCode:
              data.errorCode,
            traceId:
              data.traceId,
            error:
              data.error,
          },
        );

        return;
      }

      /*
       * 후원한 본인 화면에는 polling을 기다리지 않고
       * 바로 채팅을 표시한다.
       * 다른 시청자는 기존 채팅 polling으로 받는다.
       */
      if (data.message) {
        setChatMessages(
          (previous) => {
            if (
              previous.some(
                (item) =>
                  item.id ===
                  data.message.id,
              )
            ) {
              return previous;
            }

            return [
              ...previous,
              data.message,
            ];
          },
        );
      }
    } catch (error) {
      /*
       * 채팅 표시 실패가 이미 성공한 후원을
       * 실패로 바꾸면 안 된다.
       */
      console.error(
        "DONATION CHAT ERROR:",
        error,
      );
    }
  }

  function parseAutoDonationInteger(
    value: string,
  ) {
    const parsed =
      Number(value);

    if (
      !Number.isSafeInteger(parsed) ||
      parsed < 1
    ) {
      return null;
    }

    return parsed;
  }

  function waitAutoDonation(
    milliseconds: number,
  ) {
    return new Promise<void>(
      (resolve) => {
        window.setTimeout(
          resolve,
          milliseconds,
        );
      },
    );
  }

  async function sendDonationAmount(
    amount: number,
    automatic = false,
    donationMode: "single" | "repeat" | "sequence" = "single",
  ): Promise<boolean> {
    if (
      donationRequestBusyRef.current
    ) {
      return false;
    }

    if (
      !Number.isSafeInteger(amount) ||
      amount < 1
    ) {
      setDonationMessage(
        "후원 금액을 확인해주세요.",
      );
      return false;
    }

    if (!broadcasterUserId) {
      setDonationMessage(
        "방송자 정보를 확인할 수 없습니다.",
      );
      return false;
    }

    try {
      donationRequestBusyRef.current =
        true;

      setDonationBusy(true);

      if (!automatic) {
        setDonationMessage("");
        setDonationTraceId("");
      }

      const response =
        await fetch(
          "/api/donation",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              roomId,
              amount,
              donationMode,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        if (
          data.errorCode ===
          "DONATION_AUTH_REQUIRED"
        ) {
          setDonationMessage(
            "로그인 후 후원할 수 있습니다.",
          );
        } else if (
          data.errorCode ===
          "DONATION_INSUFFICIENT_BALANCE"
        ) {
          setDonationMessage(
            "보유 FLAT이 부족합니다.",
          );
        } else if (
          data.errorCode ===
          "DONATION_SELF_NOT_ALLOWED"
        ) {
          setDonationMessage(
            "자기 자신에게 후원할 수 없습니다.",
          );
        } else {
          setDonationMessage(
            data.error ||
              "후원 처리에 실패했습니다.",
          );
        }

        if (
          typeof data.traceId ===
          "string"
        ) {
          setDonationTraceId(
            data.traceId,
          );
        }

        return false;
      }

      if (!automatic) {
        setDonationMessage(
          `${amount.toLocaleString()} FLAT 후원이 완료되었습니다.`,
        );
      }

      if (
        typeof data.traceId ===
        "string"
      ) {
        setDonationTraceId(
          data.traceId,
        );
      }

      await sendDonationChatMessage(
        amount,
        donationMode,
      );

      void loadDonationBalance();

      return true;
    } catch (error) {
      console.error(
        "DONATION FAILED:",
        error,
      );

      setDonationMessage(
        "후원 요청 중 오류가 발생했습니다.",
      );

      return false;
    } finally {
      donationRequestBusyRef.current =
        false;

      setDonationBusy(false);
    }
  }

  async function sendDonation() {
    if (
      donationBusy ||
      autoDonationRunning
    ) {
      return;
    }

    await sendDonationAmount(
      donationAmount,
      false,
      "single",
    );
  }

  function stopAutoDonation() {
    autoDonationStopRef.current =
      true;

    setAutoDonationProgress(
      "자동 선물 중지 요청...",
    );
  }

  async function startRepeatDonation() {
    if (
      autoDonationRunning ||
      donationBusy
    ) {
      return;
    }

    const amount =
      parseAutoDonationInteger(
        autoRepeatAmount,
      );

    const count =
      parseAutoDonationInteger(
        autoRepeatCount,
      );

    if (!amount || !count) {
      setDonationMessage(
        "반복 금액과 횟수를 확인해주세요.",
      );
      return;
    }

    if (count > 1000) {
      setDonationMessage(
        "반복 횟수는 최대 1,000회까지 가능합니다.",
      );
      return;
    }

    const total =
      amount * count;

    if (!Number.isSafeInteger(total)) {
      setDonationMessage(
        "자동 선물 총 금액이 너무 큽니다.",
      );
      return;
    }

    if (
      donationBalance !== null &&
      total > donationBalance
    ) {
      setDonationMessage(
        `보유 FLAT이 부족합니다. 예상 사용 ${total.toLocaleString()} FLAT`,
      );
      return;
    }

    autoDonationStopRef.current =
      false;

    setAutoDonationRunning(true);
    setDonationMessage("");
    setDonationTraceId("");

    try {
      for (
        let index = 0;
        index < count;
        index += 1
      ) {
        if (
          autoDonationStopRef.current
        ) {
          setAutoDonationProgress(
            `${index}/${count}회에서 중지됨`,
          );
          break;
        }

        setAutoDonationProgress(
          `${index + 1}/${count}회 · ${amount.toLocaleString()} FLAT 전송 중`,
        );

        const success =
          await sendDonationAmount(
            amount,
            true,
            "repeat",
          );

        if (!success) {
          autoDonationStopRef.current =
            true;

          setAutoDonationProgress(
            `${index + 1}/${count}회 처리 중 중단`,
          );
          break;
        }

        if (
          index < count - 1 &&
          !autoDonationStopRef.current
        ) {
          await waitAutoDonation(
            autoDonationInterval *
              1000,
          );
        }
      }

      if (
        !autoDonationStopRef.current
      ) {
        setAutoDonationProgress(
          `완료 · ${count}회 전송`,
        );

        setDonationMessage(
          `자동 선물 완료 · 총 ${total.toLocaleString()} FLAT`,
        );
      }
    } finally {
      setAutoDonationRunning(false);

      void loadDonationBalance();
    }
  }

  async function startSequenceDonation() {
    if (
      autoDonationRunning ||
      donationBusy
    ) {
      return;
    }

    const start =
      parseAutoDonationInteger(
        autoSequenceStart,
      );

    const finish =
      parseAutoDonationInteger(
        autoSequenceEnd,
      );

    const step =
      parseAutoDonationInteger(
        autoSequenceStep,
      );

    if (
      !start ||
      !finish ||
      !step
    ) {
      setDonationMessage(
        "시작·끝·증가 금액을 확인해주세요.",
      );
      return;
    }

    if (finish < start) {
      setDonationMessage(
        "끝 금액은 시작 금액보다 크거나 같아야 합니다.",
      );
      return;
    }

    const amounts: number[] = [];

    for (
      let amount = start;
      amount <= finish;
      amount += step
    ) {
      amounts.push(amount);

      if (amounts.length > 1000) {
        setDonationMessage(
          "순차 선물은 최대 1,000회까지 가능합니다.",
        );
        return;
      }

      if (
        !Number.isSafeInteger(
          amount + step,
        )
      ) {
        break;
      }
    }

    if (amounts.length === 0) {
      setDonationMessage(
        "순차 선물 범위를 확인해주세요.",
      );
      return;
    }

    const total =
      amounts.reduce(
        (sum, amount) =>
          sum + amount,
        0,
      );

    if (!Number.isSafeInteger(total)) {
      setDonationMessage(
        "자동 선물 총 금액이 너무 큽니다.",
      );
      return;
    }

    if (
      donationBalance !== null &&
      total > donationBalance
    ) {
      setDonationMessage(
        `보유 FLAT이 부족합니다. 예상 사용 ${total.toLocaleString()} FLAT`,
      );
      return;
    }

    autoDonationStopRef.current =
      false;

    setAutoDonationRunning(true);
    setDonationMessage("");
    setDonationTraceId("");

    try {
      for (
        let index = 0;
        index < amounts.length;
        index += 1
      ) {
        const amount =
          amounts[index];

        if (
          autoDonationStopRef.current
        ) {
          setAutoDonationProgress(
            `${index}/${amounts.length}회에서 중지됨`,
          );
          break;
        }

        setAutoDonationProgress(
          `${index + 1}/${amounts.length}회 · ${amount.toLocaleString()} FLAT 전송 중`,
        );

        const success =
          await sendDonationAmount(
            amount,
            true,
            "sequence",
          );

        if (!success) {
          autoDonationStopRef.current =
            true;

          setAutoDonationProgress(
            `${index + 1}/${amounts.length}회 처리 중 중단`,
          );
          break;
        }

        if (
          index <
            amounts.length - 1 &&
          !autoDonationStopRef.current
        ) {
          await waitAutoDonation(
            autoDonationInterval *
              1000,
          );
        }
      }

      if (
        !autoDonationStopRef.current
      ) {
        setAutoDonationProgress(
          `완료 · ${amounts.length}회 전송`,
        );

        setDonationMessage(
          `순차 선물 완료 · 총 ${total.toLocaleString()} FLAT`,
        );
      }
    } finally {
      setAutoDonationRunning(false);

      void loadDonationBalance();
    }
  }



  useEffect(() => {
    let cancelled = false;

    async function closeViewerById(
      activeViewerId: string,
    ) {
      if (
        !activeViewerId ||
        !roomId
      ) {
        return;
      }

      try {
        await closeLiveViewer(
          roomId,
          activeViewerId,
        );
      } catch {
        // 페이지 종료 중 실패는 heartbeat 만료로 정리
      }
    }

    async function closeViewer() {
      const activeViewerId =
        viewerIdRef.current;

      if (!activeViewerId) {
        return;
      }

      await closeViewerById(
        activeViewerId,
      );
    }

    async function connectToBroadcaster(
      activeViewerId: string,
      offerSdp: string,
    ) {
      return connectLiveViewer({
        roomId,
        activeViewerId,
        offerSdp,
        peerRef,
        videoRef,
        viewerIdRef,
        lastOfferSdpRef,
        connectingRef,
        setViewerId,
        setStatus,
        setError,
        isCancelled: () => cancelled,
        isModerationBlocked: () =>
          moderationBlocked,
        restartOfferPolling: (nextViewerId) => {
          startOfferPolling(nextViewerId);
        },
      });
    }

    // FLATLIVE_VIEWER_BANNED_CLIENT_V1
    let moderationBlocked = false;

    type ViewerBanPayload = {
      errorCode?: string;
      error?: string;
      duration?: string;
      expiresAt?: string | null;
    };

    function stopForViewerBan(
      data: ViewerBanPayload,
    ) {
      return handleViewerBan({
        data,
        blockModeration: () => {
          moderationBlocked = true;
        },
        offerTimerRef,
        peerRef,
        videoRef,
        viewerIdRef,
        lastOfferSdpRef,
        connectingRef,
        setViewerId,
        setStatus,
        setError,
      });
    }

    function startOfferPolling(
      activeViewerId: string,
    ) {
      if (
        offerTimerRef.current
      ) {
        clearInterval(
          offerTimerRef.current,
        );
      }

      const pollOffer =
        async () => {
          if (moderationBlocked) {
            return;
          }

          try {
            const response =
              await fetch(
                `/api/live/signal?roomId=${encodeURIComponent(
                  roomId,
                )}&viewerId=${encodeURIComponent(
                  activeViewerId,
                )}`,
                {
                  cache: "no-store",
                },
              );

            if (
              response.status === 403
            ) {
              const banData =
                await response.json();

              if (
                stopForViewerBan(
                  banData,
                )
              ) {
                return;
              }
            }

            if (
              response.status === 404
            ) {
              const roomResponse =
                await fetch(
                  `/api/live/signal?roomId=${encodeURIComponent(
                    roomId,
                  )}`,
                  {
                    cache: "no-store",
                  },
                );

              if (
                roomResponse.status === 404
              ) {
                if (
                  offerTimerRef.current
                ) {
                  clearInterval(
                    offerTimerRef.current,
                  );

                  offerTimerRef.current =
                    null;
                }

                const activePeer =
                  peerRef.current;

                if (activePeer) {
                  activePeer.ontrack =
                    null;
                  activePeer.oniceconnectionstatechange =
                    null;
                  activePeer.onconnectionstatechange =
                    null;
                  activePeer.onicecandidateerror =
                    null;

                  activePeer.close();
                  peerRef.current =
                    null;
                }

                if (
                  videoRef.current
                ) {
                  videoRef.current.pause();
                  videoRef.current.srcObject =
                    null;
                }

                setError("");
                setStatus(
                  "방송이 종료되었습니다.",
                );

                return;
              }

              setStatus(
                "방송 연결정보 기다리는 중...",
              );

              return;
            }

            if (!response.ok) {
              return;
            }

            const data =
              await response.json();

            const offerSdp =
              typeof data.offer?.sdp ===
              "string"
                ? data.offer.sdp
                : "";

            if (!offerSdp) {
              return;
            }

            if (
              offerSdp ===
              lastOfferSdpRef.current
            ) {
              return;
            }

            if (
              connectingRef.current
            ) {
              return;
            }

            await connectToBroadcaster(
              activeViewerId,
              offerSdp,
            );
          } catch (err) {
            console.error(
              "OFFER POLL FAILED:",
              err,
            );
          }
        };

      void pollOffer();

      offerTimerRef.current =
        setInterval(() => {
          void pollOffer();
        }, 700);
    }

    async function sendViewerHeartbeat(
      activeViewerId: string,
    ) {
      if (moderationBlocked) {
        return;
      }

      try {
        const {
          response,
          data,
        } = await sendLiveViewerHeartbeat(
          roomId,
          activeViewerId,
        );

        if (
          response.status === 403 &&
          data &&
          stopForViewerBan(data)
        ) {
          return;
        }
      } catch (heartbeatError) {
        console.warn(
          "VIEWER HEARTBEAT FAILED:",
          heartbeatError,
        );
      }
    }

    async function createViewer() {
      if (
        moderationBlocked ||
        cancelled ||
        viewerIdRef.current
      ) {
        return;
      }

      const adultAccessAllowed =
        await checkAdultLiveAccess({
          roomId,
          setAdultLiveAccess,
          setLiveIsAdult,
        });

      if (
        !adultAccessAllowed ||
        cancelled ||
        viewerIdRef.current
      ) {
        return;
      }

      try {
        setStatus(
          "시청자 연결정보 생성 중...",
        );

        const {
          response,
          data,
        } = await createLiveViewer(
          roomId,
        );

        if (!response.ok) {
          if (
            stopForViewerBan(data)
          ) {
            return;
          }

          throw new Error(
            data.error ||
              "시청자 연결정보 생성에 실패했습니다.",
          );
        }

        if (!data.viewerId) {
          throw new Error(
            "viewerId를 받지 못했습니다.",
          );
        }

        const newViewerId =
          data.viewerId as string;

        /*
         * 개발모드 StrictMode 또는 빠른 화면 전환 중
         * 이전 effect의 비동기 요청이 늦게 완료된 경우
         * 유령 viewer로 남기지 않고 즉시 제거한다.
         */
        if (cancelled) {
          await closeViewerById(
            newViewerId,
          );

          return;
        }

        /*
         * 이미 현재 viewer가 만들어진 상태라면
         * 뒤늦게 도착한 중복 viewer를 삭제한다.
         */
        if (
          viewerIdRef.current &&
          viewerIdRef.current !==
            newViewerId
        ) {
          await closeViewerById(
            newViewerId,
          );

          return;
        }

        viewerIdRef.current =
          newViewerId;

        setViewerId(
          newViewerId,
        );

        setStatus(
          "방송자 응답 기다리는 중...",
        );

        startOfferPolling(
          newViewerId,
        );

        void sendViewerHeartbeat(
          newViewerId,
        );
      } catch (err) {
        console.error(
          "CREATE VIEWER FAILED:",
          err,
        );

        if (!cancelled) {
          setStatus("연결 실패");

          setError(
            err instanceof Error
              ? err.message
              : "시청 연결 준비 중 오류가 발생했습니다.",
          );
        }
      }
    }

    if (!roomId) {
      return;
    }

    lastOfferSdpRef.current = "";
    connectingRef.current = false;

    void loadBroadcasterInfo();
    void createViewer();

    const viewerHeartbeatTimer =
      setInterval(() => {
        if (moderationBlocked) {
          return;
        }

        const activeViewerId =
          viewerIdRef.current;

        if (!activeViewerId) {
          return;
        }

        void sendViewerHeartbeat(
          activeViewerId,
        );
      }, 15000);

    const recoverViewerPlayback =
      async () => {
        if (moderationBlocked) {
          return;
        }

        if (
          document.visibilityState === "hidden"
        ) {
          return;
        }

        const peer =
          peerRef.current;

        const video =
          videoRef.current;

        if (
          peer?.connectionState ===
            "connected" &&
          video?.srcObject
        ) {
          try {
            await video.play();
          } catch (playError) {
            console.warn(
              "VIEWER RESUME PLAY FAILED:",
              playError,
            );
          }

          return;
        }

        if (
          !peer ||
          peer.connectionState ===
            "connecting" ||
          peer.connectionState ===
            "new"
        ) {
          return;
        }

        if (
          peer.connectionState !==
            "disconnected" &&
          peer.connectionState !==
            "failed" &&
          peer.connectionState !==
            "closed"
        ) {
          return;
        }

        if (offerTimerRef.current) {
          clearInterval(
            offerTimerRef.current,
          );

          offerTimerRef.current =
            null;
        }

        peer.ontrack = null;
        peer.oniceconnectionstatechange =
          null;
        peer.onconnectionstatechange =
          null;
        peer.onicecandidateerror =
          null;

        peer.close();
        peerRef.current = null;

        await closeViewer();

        viewerIdRef.current = "";
        setViewerId("");
        lastOfferSdpRef.current = "";
        connectingRef.current = false;

        if (!moderationBlocked) {
          await createViewer();
        }
      };

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void recoverViewerPlayback();
        }
      };

    const handleWindowFocus =
      () => {
        void recoverViewerPlayback();
      };

    const handlePageShow =
      () => {
        void recoverViewerPlayback();
      };

    const handleBeforeUnload =
      () => {
        // FLATLIVE_VIEWER_CLOSE_BEACON_V1
        const activeViewerId =
          viewerIdRef.current;

        if (
          !activeViewerId ||
          !roomId
        ) {
          return;
        }

        closeLiveViewerBeacon(
          roomId,
          activeViewerId,
        );

        viewerIdRef.current = "";
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "focus",
      handleWindowFocus,
    );

    window.addEventListener(
      "pageshow",
      handlePageShow,
    );

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    window.addEventListener(
      "pagehide",
      handleBeforeUnload,
    );

    return () => {
      cancelled = true;

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus,
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow,
      );

      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload,
      );

      window.removeEventListener(
        "pagehide",
        handleBeforeUnload,
      );

      clearInterval(
        viewerHeartbeatTimer,
      );

      if (
        offerTimerRef.current
      ) {
        clearInterval(
          offerTimerRef.current,
        );

        offerTimerRef.current =
          null;
      }

      const peer =
        peerRef.current;

      if (peer) {
        peer.ontrack = null;
        peer.oniceconnectionstatechange =
          null;
        peer.onconnectionstatechange =
          null;
        peer.onicecandidateerror =
          null;

        peer.close();
      }

      peerRef.current = null;

      void closeViewer();

      viewerIdRef.current = "";
      lastOfferSdpRef.current = "";
      connectingRef.current = false;
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled = false;

    const loadChat =
      async () => {
        try {
          const response =
            await fetch(
              `/api/live/chat?roomId=${encodeURIComponent(
                roomId,
              )}`,
              {
                cache: "no-store",
              },
            );

          const data =
            await response.json();

          if (!response.ok) {
            if (response.status === 404) {
              // FLATLIVE_STALE_ROOM_POLLING_STOP_V1
              // A confirmed dead LIVE room must stop the whole watch page.
              // Leaving the route unmounts signal/chat/match/moderation polls together.
              cancelled = true;

              console.warn(
                "WATCH STALE LIVE ROOM POLLING STOP:",
                {
                  roomId,
                  errorCode: data?.errorCode,
                  traceId: data?.traceId,
                },
              );

              if (chatTimerRef.current) {
                clearInterval(
                  chatTimerRef.current,
                );
                chatTimerRef.current = null;
              }

              window.location.replace("/live");
              return;
            }

            if (
              response.status !== 404
            ) {
              console.error(
                "CHAT POLL FAILED:",
                {
                  roomId,
                  errorCode:
                    data.errorCode,
                  traceId:
                    data.traceId,
                  error:
                    data.error,
                },
              );
            }

            return;
          }

          if (
            !cancelled &&
            Array.isArray(
              data.messages,
            )
          ) {
            setChatMessages((previous) => {
              const next =
                data.messages as LiveChatMessage[];

              const same =
                previous.length === next.length &&
                previous.every(
                  (item, index) =>
                    item.id === next[index]?.id &&
                    item.donationMode ===
                      next[index]?.donationMode,
                );

              return same
                ? previous
                : next;
            });
          }
        } catch (err) {
          console.error(
            "CHAT POLL ERROR:",
            err,
          );
        }
      };

    void loadChat();

    chatTimerRef.current =
      setInterval(() => {
        void loadChat();
      }, 700);

    return () => {
      cancelled = true;

      if (
        chatTimerRef.current
      ) {
        clearInterval(
          chatTimerRef.current,
        );

        chatTimerRef.current =
          null;
      }
    };
  }, [roomId]);

  useEffect(() => {
    if (
      !chatPinnedToBottomRef.current
    ) {
      return;
    }

    const frame =
      requestAnimationFrame(() => {
        const chatBox =
          chatScrollRef.current;

        if (!chatBox) {
          return;
        }

        chatBox.scrollTop =
          chatBox.scrollHeight;

        setShowLatestChatButton(false);
      });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [chatMessages]);

  function scrollChatToLatest() {
    const chatBox =
      chatScrollRef.current;

    if (!chatBox) {
      return;
    }

    chatPinnedToBottomRef.current =
      true;

    setShowLatestChatButton(false);

    chatBox.scrollTo({
      top: chatBox.scrollHeight,
      behavior: "smooth",
    });
  }

  async function sendChat(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (viewerChatMuted) {
      setChatError("");
      setChatInput("");
      return;
    }

    const message =
      chatInput.trim();

    if (
      !message ||
      chatSending
    ) {
      return;
    }

    try {
      setChatSending(true);
      setChatError("");

      const response =
        await fetch(
          "/api/live/chat",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              roomId,
              message,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        // FLATLIVE_CHAT_MUTE_CLIENT_MESSAGE_V3
        // FLATLIVE_FORBIDDEN_WORD_CLIENT_MESSAGE_V1
        const isChatMuted =
          data.errorCode ===
          "LIVE_CHAT_MUTED";

        const isForbiddenWord =
          data.errorCode ===
          "LIVE_CHAT_FORBIDDEN_WORD";

        const isExpectedChatBlock =
          isChatMuted ||
          isForbiddenWord;

        // FLATLIVE_FORBIDDEN_WORD_INLINE_CHAT_NOTICE_V3
        if (isForbiddenWord) {
          const noticeTime =
            Date.now();

          setForbiddenWordNotice({
            id:
              "forbidden-word-notice-" +
              noticeTime,
            roomId,
            userId: "SYSTEM",
            username: "SYSTEM",
            nickname: "안내",
            message:
              "⚠ 사용할 수 없는 표현이 포함되어 있습니다.",
            messageType: "CHAT",
            createdAt: noticeTime,
          });

          setChatInput("");
          setChatError("");

          return;
        }

        const details =
          isChatMuted
            ? String(
                data.error ||
                  "채팅이 금지되었습니다.",
              )
            : isForbiddenWord
              ? String(
                  data.error ||
                    "사용할 수 없는 표현이 포함되어 있습니다.",
                )
              : [
                  data.error,
                  data.errorCode,
                  data.traceId,
                ]
                  .filter(Boolean)
                  .join(" · ");

        setChatError(
          details ||
            "채팅 전송에 실패했습니다.",
        );

        if (!isExpectedChatBlock) {
          console.error(
            "CHAT SEND FAILED:",
            {
              roomId,
              errorCode:
                data.errorCode,
              traceId:
                data.traceId,
              error:
                data.error,
            },
          );
        }

        return;
      }

      setChatInput("");

      if (data.message) {
        setChatMessages(
          (previous) => {
            if (
              previous.some(
                (item) =>
                  item.id ===
                  data.message.id,
              )
            ) {
              return previous;
            }

            return [
              ...previous,
              data.message,
            ];
          },
        );
      }
    } catch (err) {
      console.error(
        "CHAT SEND ERROR:",
        err,
      );

      setChatError(
        "채팅 전송 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      setChatSending(false);
    }
  }

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled = false;

    const loadLiveInfo = async () => {
      try {
        const response =
          await fetch("/api/live/rooms", {
            cache: "no-store",
          });

        const data =
          await response.json();

        if (
          !response.ok ||
          !Array.isArray(data.rooms)
        ) {
          return;
        }

        const room =
          data.rooms.find(
            (item: { roomId?: string }) =>
              item.roomId === roomId,
          );

        if (!cancelled && room) {
          setViewerCount(
            Number(room.viewerCount) || 0,
          );

          setLiveStartedAt(
            Number(room.createdAt) || 0,
          );

          setLiveTitle(
            String(room.title || "LIVE 방송"),
          );
        }
      } catch (error) {
        console.error(
          "LIVE INFO POLL ERROR:",
          error,
        );
      }
    };

    void loadLiveInfo();

    const roomTimer =
      window.setInterval(
        loadLiveInfo,
        2000,
      );

    const clockTimer =
      window.setInterval(() => {
        setLiveNow(Date.now());
      }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(roomTimer);
      window.clearInterval(clockTimer);
    };
  }, [roomId]);

  const liveElapsedSeconds =
    liveStartedAt > 0
      ? Math.max(
          0,
          Math.floor(
            (liveNow - liveStartedAt) /
              1000,
          ),
        )
      : 0;

  const liveDurationText =
    [
      Math.floor(
        liveElapsedSeconds / 3600,
      ),
      Math.floor(
        (liveElapsedSeconds % 3600) /
          60,
      ),
      liveElapsedSeconds % 60,
    ]
      .map((value) =>
        String(value).padStart(2, "0"),
      )
      .join(":");

  return (
    <main className="fixed inset-0 h-screen overflow-hidden bg-black text-white md:static md:min-h-screen md:overflow-visible md:pt-16">
      {/* FLATLIVE_VIEWER_CHAT_MUTE_NOTICE_RENDER_V1 */}
      <LiveChatMuteNotice
        roomId={roomId}
        onMuteStateChange={
          setViewerChatMuted
        }
      />

      <div className="mx-auto flex h-full max-w-md flex-col overflow-hidden bg-black md:h-auto md:max-w-5xl md:overflow-visible">

        <section
          className={
            clutchMatch &&
            clutchMatch.participants.length >= 2
              ? "relative h-[46dvh] flex-none overflow-hidden bg-zinc-950 md:mb-6 md:h-[calc(100vh-88px)] md:rounded-3xl"
              : "relative flex-1 overflow-hidden bg-zinc-950 md:mb-6 md:flex-none md:h-[calc(100vh-88px)] md:rounded-3xl"
          }
          onClick={(event) => {
            const target = event.target as HTMLElement;

            if (
              target.closest(
                "button, input, form, a, [data-live-chat-scroll]",
              )
            ) {
              return;
            }

            setMobileLiveInfoVisible(true);

            setSpeakerControlsVisible((visible) => {
              const next = !visible;

              if (!next) {
                setVolumeOpen(false);
              }

              return next;
            });
          }}
        >
          {/* FLATLIVE_TREASURE_JAR_VIDEO_TOP_LEFT_V2_13 */}
          <TreasureJarOverlay
            roomId={roomId}
            mode="viewer"
          />

<video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            onLoadedMetadata={(event) => {
              const video =
                event.currentTarget;

              if (
                video.videoWidth > 0 &&
                video.videoHeight > 0
              ) {
                setRemoteVideoAspectRatio(
                  video.videoWidth /
                    video.videoHeight,
                );
              }
            }}
            className={`pointer-events-none absolute left-0 top-0 h-full w-full object-contain object-top transition-[width] duration-300 md:h-[calc(100%-112px)] md:object-center ${
              pcChatOpen
                ? "md:w-[calc(100%-360px)]"
                : "md:w-full"
            }`}
          />

          {/* FLATLIVE_PC_CLUTCH_CHAT_LAYOUT_V1 */}
          <div
            className={`absolute inset-y-0 left-0 z-20 w-full transition-[right,width] duration-300 md:w-auto ${
              pcChatOpen
                ? "md:right-[360px]"
                : "md:right-0"
            }`}
          >
            {/* FLATLIVE_CLUTCH_MULTI_GRID_VIEWER_V1 */}
            <ClutchVideoGrid
              roomId={roomId}
              match={clutchMatch}
              primaryStream={
                (
                  videoRef.current
                    ?.srcObject as
                    MediaStream | null
                ) ?? null
              }
              streams={
                clutchRemoteStreams
              }
              videoRect={
                videoContentRect
              }
              role="viewer"
            />
          </div>

          {/* FLATLIVE_VIEWER_COMMON_VIDEO_CHAT_OVERLAY */}
          {viewerChatOverlayEnabled &&
            visibleChatMessages.length > 0 && (
              <div
                className="pointer-events-none absolute z-[220]"
                style={
                  videoContentRect
                    ? {
                        left:
                          videoContentRect.left,
                        top:
                          videoContentRect.top,
                        width:
                          videoContentRect.width,
                        height:
                          videoContentRect.height,
                      }
                    : {
                        left: 0,
                        top: 0,
                        width: "100%",
                        height: "100%",
                      }
                }
              >
                {/* 모바일 시청자 */}
                <div className="hidden">
                  <MobileDraggableChatOverlay
                    roomId={roomId}
                    actionMode="viewer"
                    messages={visibleChatMessages}
                    size={viewerChatOverlaySize}
                    count={viewerChatOverlayCount}
                    x={viewerChatOverlayX}
                    y={viewerChatOverlayY}
                    opacity={
                      viewerChatOverlayOpacity
                    }
                    draggable={false}
                    compact={true}
                    scrollable={true}
                    positioning="absolute"
                    onPositionChange={() => {
                      // 시청자는 위치 변경 안 함
                    }}
                  />
                </div>

                {/* PC 시청자 */}
                <div className="hidden md:block">
                  <MobileDraggableChatOverlay
                    roomId={roomId}
                    actionMode="viewer"
                    messages={visibleChatMessages}
                    size={viewerChatOverlaySize}
                    count={viewerChatOverlayCount}
                    x={viewerChatOverlayX}
                    y={viewerChatOverlayY}
                    opacity={
                      viewerChatOverlayOpacity
                    }
                    draggable={false}
                    compact={false}
                    scrollable={false}
                    positioning="absolute"
                    onPositionChange={() => {
                      // 시청자는 위치 변경 안 함
                    }}
                  />
                </div>
              </div>
            )}

          {/* FLATLIVE_MOBILE_VIEWER_CHAT_BLACK_AREA_V1 */}
          {typeof document !== "undefined" &&
            createPortal(
              <>
                {visibleChatMessages.length > 0 &&
                  !mobileViewerChatHidden && (
                    <div
                      className="pointer-events-none fixed inset-x-0 z-[300] md:hidden"
                      style={{
                        top: videoContentRect
                          ? `min(${videoContentRect.top + videoContentRect.height}px, calc(100dvh - 276px))`
                          : "46dvh",
                        bottom: "96px",
                      }}
                    >
                      <div className="pointer-events-none flex h-full min-h-0 flex-col">
                        {/* 영상 아래 검은 영역에서 시작 */}
                        <div
                          data-live-chat-scroll
                          className="pointer-events-auto min-h-[180px] flex-1 w-[calc(100%-84px)] overflow-y-auto px-3 pt-2 text-[12px] leading-[16px] text-white [&::-webkit-scrollbar]:hidden"
                        >
                          {visibleChatMessages.map((chat) => (
                            <div
                              key={chat.id}
                              className={[
                                "mb-1 min-w-0 max-w-[82%] break-words",
                                chat.isBroadcaster
                                  ? "w-fit rounded-lg border border-yellow-200/20 border-l-2 border-l-yellow-300/80 bg-gradient-to-r from-yellow-300/15 via-black/60 to-black/30 px-2.5 py-1.5 shadow-lg backdrop-blur-sm"
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              style={{
                                textShadow:
                                  "0 1px 3px rgba(0,0,0,.95)",
                              }}
                            >
                              {chat.nicknameTone === "VIP" && (
                                <span className="mr-1">👑</span>
                              )}

                              {chat.nicknameTone === "FAN" && (
                                <span className="mr-1">♥</span>
                              )}

                              {chat.isManager &&
                                chat.isBroadcaster === false && (
                                  <span className="mr-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-yellow-300/50 bg-yellow-400/15 px-1 text-[9px] font-black leading-none text-yellow-300">
                                    M
                                  </span>
                                )}

                              <strong
                                className={[
                                  "mr-1 font-extrabold",
                                  chat.nicknameTone === "BROADCASTER"
                                    ? "text-yellow-300"
                                    : chat.nicknameTone === "VIP"
                                      ? "text-fuchsia-300"
                                      : chat.nicknameTone === "FAN"
                                        ? "text-amber-300"
                                        : "text-white",
                                ].join(" ")}
                              >
                                {chat.nickname ||
                                  chat.username ||
                                  "시청자"}
                              </strong>

                              <span className="text-white/95">
                                {chat.message}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pointer-events-auto flex h-8 shrink-0 items-center px-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setMobileViewerChatHidden(true);
                            }}
                            className="rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold text-white/75 backdrop-blur-sm"
                          >
                            채팅 숨김
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                {/* FLATLIVE_MOBILE_VIEWER_CHAT_REOPEN_V1 */}
                {mobileViewerChatHidden && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMobileViewerChatHidden(false);
                    }}
                    className="pointer-events-auto fixed left-[14px] bottom-[120px] z-[2600] rounded-full border border-white/15 bg-black/65 px-3 py-2 text-[11px] font-black text-white shadow-lg backdrop-blur-sm md:hidden"
                  >
                    💬 채팅 보기
                  </button>
                )}
              </>,
              document.body,
            )}

          {liveIsAdult &&
            adultLiveAccess !== "allowed" && (
              <div className="absolute inset-0 z-[500] flex items-center justify-center bg-black px-6">
                <div className="w-full max-w-sm text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-xl font-black text-white">
                    19+
                  </div>

                  <h2 className="mt-5 text-xl font-black text-white">
                    19세 이상 콘텐츠입니다
                  </h2>

                  {adultLiveAccess ===
                    "checking" && (
                    <p className="mt-3 text-sm text-zinc-400">
                      성인인증 상태를 확인하고 있습니다.
                    </p>
                  )}

                  {adultLiveAccess ===
                    "login-required" && (
                    <>
                      <p className="mt-3 text-sm leading-6 text-zinc-400">
                        이 방송을 시청하려면
                        로그인 후 성인인증이 필요합니다.
                      </p>

                      <a
                        href="/login"
                        className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-flat-yellow text-sm font-black text-black"
                      >
                        로그인
                      </a>
                    </>
                  )}

                  {adultLiveAccess ===
                    "verification-required" && (
                    <>
                      <p className="mt-3 text-sm leading-6 text-zinc-400">
                        휴대폰 본인인증을 완료한
                        성인만 시청할 수 있습니다.
                      </p>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const response =
                              await fetch(
                                "/api/adult/verify/start",
                                {
                                  method: "POST",
                                },
                              );

                            const data =
                              await response.json();

                            if (
                              data.errorCode ===
                              "ADULT_AUTH_REQUIRED"
                            ) {
                              window.location.href =
                                "/login";
                              return;
                            }

                            if (
                              data.errorCode ===
                              "ADULT_PROVIDER_NOT_CONFIGURED"
                            ) {
                              alert(
                                "휴대폰 본인인증 서비스가 아직 연결되지 않았습니다.",
                              );
                              return;
                            }

                            if (!response.ok) {
                              alert(
                                data.error ||
                                  "성인인증을 시작하지 못했습니다.",
                              );
                              return;
                            }

                            /*
                             * 실제 NICE/KCB/PASS 연결 후
                             * 여기서 인증창 또는 인증 URL로 이동합니다.
                             */
                          } catch (error) {
                            console.error(
                              "ADULT VERIFICATION START FAILED:",
                              error,
                            );

                            alert(
                              "성인인증을 시작하지 못했습니다.",
                            );
                          }
                        }}
                        className="mt-6 h-12 w-full rounded-xl bg-flat-yellow text-sm font-black text-black"
                      >
                        휴대폰으로 성인인증
                      </button>
                    </>
                  )}

                  {adultLiveAccess === "error" && (
                    <>
                      <p className="mt-3 text-sm leading-6 text-zinc-400">
                        성인인증 상태를 확인하지 못했습니다.
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          window.location.reload();
                        }}
                        className="mt-6 h-12 w-full rounded-xl bg-white/10 text-sm font-black text-white"
                      >
                        다시 시도
                      </button>
                    </>
                  )}

                  <a
                    href="/live"
                    className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-white/10 text-sm font-bold text-zinc-300"
                  >
                    LIVE 목록으로 돌아가기
                  </a>
                </div>
              </div>
            )}

          {soundPromptVisible &&
            adultLiveAccess === "allowed" && (
            <div className="pointer-events-none absolute inset-0 z-[2000] flex items-center justify-center">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void enableSound();
                }}
                onPointerUp={(event) => {
                  event.stopPropagation();
                }}
                className="pointer-events-auto relative z-[2001] touch-manipulation rounded-full border border-white/20 bg-black/70 px-6 py-3 text-sm font-bold text-white shadow-xl backdrop-blur-md"
                aria-label="소리 켜기"
              >
                🔊 소리 켜기
              </button>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 to-transparent" />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

          <div className={`fixed inset-x-0 top-0 z-[400] flex items-start justify-between gap-3 px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] transition-opacity duration-300 md:hidden ${
              mobileLiveInfoVisible
                ? "opacity-100"
                : "pointer-events-none opacity-0"
            } ${
              pcChatOpen
                ? "md:right-[360px]"
                : "md:right-0"
            }`}>
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="h-10 w-10 shrink-0 rounded-full border-2 border-flat-yellow bg-zinc-700 bg-cover bg-center"
                style={
                  broadcasterAvatarUrl
                    ? {
                        backgroundImage:
                          `url(${broadcasterAvatarUrl})`,
                      }
                    : undefined
                }
              />

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <LiveLevelBadge
                    label={`FLATIST Lv.${broadcasterLevel}`}
                  />
                  <strong className="max-w-[110px] truncate text-sm">
                    {broadcasterName}
                  </strong>

                  <button
                    type="button"
                    onClick={toggleFollow}
                    disabled={followBusy}
                    className={`rounded-full px-3 py-1 text-[10px] font-black transition ${
                      following
                        ? "border border-white/20 bg-white/10 text-white"
                        : "bg-flat-yellow text-black"
                    } disabled:opacity-50`}
                  >
                    {followBusy
                      ? "처리 중"
                      : following
                        ? "팔로잉"
                        : "팔로우"}
                  </button>
                </div>

                <p className="mt-0.5 text-[10px] text-zinc-300">
                  {broadcasterUsername
                    ? `@${broadcasterUsername} · `
                    : ""}
                  팔로워 {followerCount}명
                </p>

                {/* FLATLIVE_VIEWER_FAN_JOIN_BUTTONS_V2 */}
                <div className="pointer-events-auto mt-1.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void openFanJoin("FAN");
                    }}
                    className="rounded-full border border-white/25 bg-black/55 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur-md active:scale-95"
                  >
                    팬가입
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void openFanJoin("VIP");
                    }}
                    className="rounded-full border border-flat-yellow/60 bg-flat-yellow px-2.5 py-1 text-[10px] font-black text-black shadow-lg active:scale-95"
                  >
                    VIP 팬가입
                  </button>
                </div>

                {fanJoinTier && (
                  <div
                    className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <div
                      className={`relative w-full max-w-[390px] overflow-hidden rounded-[28px] border shadow-2xl ${
                        fanJoinTier === "VIP"
                          ? "border-amber-300/60 bg-gradient-to-b from-[#2a210b] via-[#17130b] to-black"
                          : "border-white/15 bg-gradient-to-b from-zinc-800 via-zinc-950 to-black"
                      }`}
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    >
                      {fanJoinLoading ? (
                        <div className="flex min-h-[280px] items-center justify-center text-sm font-bold text-white">
                          팬가입 정보를 불러오는 중...
                        </div>
                      ) : fanJoinData ? (
                        <>
                          {fanJoinTier === "VIP" &&
                            fanJoinData.settings.vipImageUrl && (
                              <div className="relative h-44 overflow-hidden bg-black">
                                <img
                                  src={
                                    fanJoinData.settings
                                      .vipImageUrl
                                  }
                                  alt="VIP 팬가입 이미지"
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                              </div>
                            )}

                          <div className="p-5">
                            <button
                              type="button"
                              onClick={() =>
                                setFanJoinTier(null)
                              }
                              disabled={fanJoinBusy}
                              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-lg font-black text-white"
                            >
                              ×
                            </button>

                            <div
                              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ${
                                fanJoinTier === "VIP"
                                  ? "bg-amber-300 text-black"
                                  : "bg-white/10 text-white"
                              }`}
                            >
                              {fanJoinTier === "VIP"
                                ? "👑 VIP FAN"
                                : "💛 FAN"}
                            </div>

                            <h2 className="mt-3 text-xl font-black text-white">
                              {broadcasterName}
                              {fanJoinTier === "VIP"
                                ? "님의 VIP 팬이 되어보세요"
                                : "님의 팬이 되어보세요"}
                            </h2>

                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                              {fanJoinTier === "VIP"
                                ? fanJoinData.settings
                                    .vipMessage
                                : fanJoinData.settings
                                    .fanMessage}
                            </p>

                            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                              <div className="flex justify-between">
                                <span className="text-xs font-bold text-zinc-400">
                                  가입 금액
                                </span>
                                <strong className="text-lg font-black text-flat-yellow">
                                  {(fanJoinTier === "VIP"
                                    ? fanJoinData.settings
                                        .vipPriceFlat
                                    : fanJoinData.settings
                                        .fanPriceFlat
                                  ).toLocaleString()}
                                  {" FLAT"}
                                </strong>
                              </div>

                              <div className="mt-3 flex justify-between">
                                <span className="text-xs font-bold text-zinc-400">
                                  가입 기간
                                </span>
                                <span className="text-sm font-black text-white">
                                  {(fanJoinTier === "VIP"
                                    ? fanJoinData.settings
                                        .vipDurationType
                                    : fanJoinData.settings
                                        .fanDurationType) ===
                                  "PERMANENT"
                                    ? "영구"
                                    : "30일"}
                                </span>
                              </div>

                              <div className="mt-3 flex justify-between border-t border-white/10 pt-3">
                                <span className="text-xs font-bold text-zinc-400">
                                  내 보유 FLAT
                                </span>
                                <span className="text-sm font-black text-white">
                                  {fanJoinData.balance.toLocaleString()}
                                  {" FLAT"}
                                </span>
                              </div>
                            </div>

                            {fanJoinMessage && (
                              <div className="mt-3 rounded-xl bg-white/10 px-3 py-2.5 text-center text-xs font-bold text-white">
                                {fanJoinMessage}
                              </div>
                            )}

                            {fanJoinData.balance <
                            (fanJoinTier === "VIP"
                              ? fanJoinData.settings
                                  .vipPriceFlat
                              : fanJoinData.settings
                                  .fanPriceFlat) ? (
                              <div className="mt-4 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFanJoinTier(null)
                                  }
                                  className="h-12 rounded-2xl border border-white/15 bg-white/5 text-sm font-black text-white"
                                >
                                  취소
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    window.location.href =
                                      "/wallet";
                                  }}
                                  className="h-12 rounded-2xl bg-flat-yellow text-sm font-black text-black"
                                >
                                  FLAT 충전하기
                                </button>
                              </div>
                            ) : (
                              <div className="mt-4 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFanJoinTier(null)
                                  }
                                  disabled={fanJoinBusy}
                                  className="h-12 rounded-2xl border border-white/15 bg-white/5 text-sm font-black text-white"
                                >
                                  취소
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void purchaseFanMembership()
                                  }
                                  disabled={fanJoinBusy}
                                  className={`h-12 rounded-2xl text-sm font-black ${
                                    fanJoinTier === "VIP"
                                      ? "bg-gradient-to-r from-amber-300 to-yellow-500 text-black"
                                      : "bg-flat-yellow text-black"
                                  }`}
                                >
                                  {fanJoinBusy
                                    ? "가입 처리 중..."
                                    : `${
                                        (
                                          fanJoinTier ===
                                          "VIP"
                                            ? fanJoinData
                                                .settings
                                                .vipPriceFlat
                                            : fanJoinData
                                                .settings
                                                .fanPriceFlat
                                        ).toLocaleString()
                                      } FLAT으로 가입`}
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}

                <div className="mt-1 max-w-[220px]">
                  <p className="truncate text-xs font-medium text-white">
                    {liveTitle}
                  </p>

                  {/* FLATLIVE_MANAGER_VIEWERLIST_SYNC_V2 - manager-only mobile viewer list */}
                  {managerViewerAccess && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openMobileViewerSheet();
                      }}
                      className="mt-1 inline-flex h-6 items-center gap-1 rounded-full bg-black/55 px-2.5 text-[11px] font-black text-white shadow-lg backdrop-blur-md active:bg-white/15"
                      aria-label="시청자 목록 열기"
                    >
                      <span>👤</span>
                      <span>{viewerCount}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setReportOpen(true);
                }}
                disabled={!broadcasterUserId}
                className="relative z-[400] flex h-8 shrink-0 items-center justify-center rounded-full border border-red-400/50 bg-red-950/80 px-2.5 text-[10px] font-black text-red-200 shadow-lg disabled:opacity-40"
                aria-label="방송 신고"
                title="신고"
              >
                신고
              </button>

              <span className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-black">
                LIVE
              </span>

              <button
                type="button"
                aria-label="방송 나가기"
                onClick={() =>
                  window.history.back()
                }
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-lg"
              >
                ×
              </button>
            </div>
          </div>

          {/* FLATLIVE_SEPARATE_VIEWER_SHEET_MODAL_V2 */}
          {managerViewerAccess &&
            mobileViewerSheetOpen &&
            typeof document !== "undefined" &&
            createPortal(
              <div className="fixed inset-0 z-[120000] md:hidden">
                <button
                  type="button"
                  aria-label="시청자 목록 배경 닫기"
                  onClick={closeMobileViewerSheet}
                  className="absolute inset-0 bg-black/35"
                />

                <div className="absolute inset-x-0 bottom-0 max-h-[54dvh] overflow-hidden rounded-t-[26px] bg-white pb-[max(18px,env(safe-area-inset-bottom))] text-black shadow-2xl">
                  <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                    <div>
                      <h2 className="text-lg font-black">
                        시청자 목록
                      </h2>

                      <p className="mt-0.5 text-xs font-bold text-zinc-500">
                        현재 {viewerCount}명 시청 중
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeMobileViewerSheet}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-3xl font-light text-zinc-600 active:bg-zinc-100"
                      aria-label="시청자 목록 닫기"
                    >
                      ×
                    </button>
                  </div>

                  <div className="max-h-[calc(54dvh-86px)] overflow-y-auto px-5 py-3 [-webkit-overflow-scrolling:touch]">
                    {managerViewerError ? (
                      <div className="py-10 text-center text-sm font-bold text-red-500">
                        {managerViewerError}
                      </div>
                    ) : mobileViewerSheetLoading &&
                    mobileViewerSheetList.length === 0 ? (
                      <div className="py-10 text-center text-sm font-bold text-zinc-500">
                        시청자 불러오는 중...
                      </div>
                    ) : mobileViewerSheetList.length === 0 ? (
                      <div className="py-10 text-center text-sm font-bold text-zinc-500">
                        현재 시청자가 없습니다.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {mobileViewerSheetList.map(
                          (viewer, index) => {
                            const displayName =
                              viewer.nickname ||
                              viewer.username ||
                              "게스트";

                            return (
                              <div
                                key={viewer.viewerId || `${displayName}-${index}`}
                                className="flex items-center gap-3 py-1.5"
                              >
                                <div className="w-8 shrink-0 text-center text-sm font-black text-zinc-600">
                                  {index + 1}
                                </div>

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-sm font-black text-zinc-600">
                                  {viewer.avatarUrl ? (
                                    <img
                                      src={viewer.avatarUrl}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    displayName.slice(0, 1).toUpperCase()
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex min-w-0 items-center gap-1.5">
                                    <span className="truncate text-[15px] font-black text-zinc-950">
                                      {displayName}
                                    </span>

                                    {viewer.isManager && (
                                      <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-black text-yellow-700">
                                        매니저
                                      </span>
                                    )}

                                    {viewer.isSelf && (
                                      <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-black text-zinc-500">
                                        나
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-0.5 truncate text-xs font-bold text-zinc-400">
                                    {viewer.username
                                      ? `@${viewer.username}`
                                      : viewer.isGuest
                                        ? "게스트"
                                        : "회원"}
                                  </div>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>,
              document.body,
            )}

          {status !== "● LIVE" && (
            <div className="absolute left-4 top-24 z-10 flex flex-col items-start gap-2">
              <div className="rounded-full bg-black/65 px-3 py-1.5 text-[10px] font-bold text-zinc-300">
                {status}
              </div>

              {(status === "방송이 종료되었습니다." ||
                status === "강퇴되었습니다.") && (
                <Link
                  href="/live"
                  className="rounded-full bg-flat-yellow px-4 py-2 text-xs font-black text-black shadow-lg"
                >
                  LIVE 목록으로 돌아가기
                </Link>
              )}
            </div>
          )}

          <div
            className={`absolute bottom-0 left-0 z-[140] hidden h-[112px] border-t border-white/10 bg-[#0b0b0b] px-5 py-4 md:flex md:flex-col md:justify-center ${
              pcChatOpen
                ? "w-[calc(100%-360px)]"
                : "w-full"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-11 w-11 shrink-0 rounded-full border-2 border-flat-yellow bg-zinc-700 bg-cover bg-center"
                style={
                  broadcasterAvatarUrl
                    ? {
                        backgroundImage:
                          `url(${broadcasterAvatarUrl})`,
                      }
                    : undefined
                }
              />

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <LiveLevelBadge
                    label={`FLATIST Lv.${broadcasterLevel}`}
                  />
                  <strong className="truncate text-base">
                    {broadcasterName}
                  </strong>

                  <button
                    type="button"
                    onClick={toggleFollow}
                    disabled={
                      followBusy ||
                      !broadcasterUserId
                    }
                    className={`rounded-full px-3 py-1 text-[11px] font-black ${
                      following
                        ? "border border-white/20 bg-white/10 text-white"
                        : "bg-flat-yellow text-black"
                    } disabled:opacity-50`}
                  >
                    {following
                      ? "팔로잉"
                      : "팔로우"}
                  </button>
                </div>

                <div className="mt-1 flex min-w-0 items-center gap-2">
                  <p className="min-w-0 truncate text-sm text-zinc-200">
                    {liveTitle}
                  </p>

                </div>

                <div className="mt-1 flex items-center gap-4 text-xs text-zinc-400">
                  <span>
                    시청자수{" "}
                    <strong className="text-white">
                      {viewerCount}
                    </strong>
                  </span>

                  <span>
                    방송시간{" "}
                    <strong className="font-mono text-white">
                      {liveDurationText}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="ml-auto hidden items-center gap-2 md:flex">
                <button
                  type="button"
                  onClick={() => {
                    void handleLiveLike();
                  }}
                  disabled={
                    liveLikeSending ||
                    liveLiked
                  }
                  className={[
                    "flex h-10 w-10 items-center justify-center rounded-full text-xl transition",
                    liveLiked
                      ? "bg-flat-yellow text-black"
                      : "bg-white/10 text-white",
                    liveLikeSending
                      ? "opacity-60"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label="좋아요"
                >
                  {liveLiked ? "♥" : "♡"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleLiveShare();
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg"
                  aria-label="공유"
                >
                  ↗
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReportOpen(true);
                  }}
                  disabled={!broadcasterUserId}
                  className="flex h-10 shrink-0 items-center justify-center rounded-full border border-red-400/40 bg-red-950/70 px-3 text-xs font-black text-red-200 disabled:opacity-40"
                  aria-label="PC 방송 신고"
                  title="신고"
                >
                  신고
                </button>

                <a
                  href="/lounge"
                  className="flex h-10 items-center justify-center rounded-full bg-white/10 px-4 text-xs font-black text-white"
                  aria-label="플랫라운지"
                >
                  라운지
                </a>

                <button
                  type="button"
                  onClick={openDonation}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-flat-yellow text-lg text-black"
                  aria-label="선물"
                >
                  🎁
                </button>
              </div>
            </div>
          </div>

          {liveIsAdult && (
            <div className="pointer-events-none absolute left-3 top-3 z-[70] md:left-5 md:top-5">
              <span className="inline-flex items-center rounded-md border border-red-400/70 bg-red-600/95 px-2.5 py-1 text-xs font-black text-white shadow-lg">
                19+
              </span>
            </div>
          )}


          <div
            ref={chatScrollRef}
            data-live-chat-scroll
            onScroll={(event) => {
              const box =
                event.currentTarget;

              const distanceFromBottom =
                box.scrollHeight -
                box.scrollTop -
                box.clientHeight;

              const atBottom =
                distanceFromBottom < 24;

              chatPinnedToBottomRef.current =
                atBottom;

              setShowLatestChatButton(
                !atBottom,
              );
            }}
            className={`hidden md:block absolute bottom-[92px] left-3 z-[90] h-[28vh] min-h-[150px] max-h-[260px] w-[72%] overflow-y-auto overscroll-contain pr-2 text-white md:bottom-[72px] md:left-auto md:right-0 md:!top-0 md:block md:h-auto md:min-h-0 md:max-h-[calc(100dvh-72px)] md:w-[360px] md:overflow-y-auto md:overscroll-contain md:border-l md:border-white/10 md:bg-zinc-950 md:px-5 md:pb-5 md:pt-20 md:transition-transform md:duration-300 ${
              mobileChatVisible
                ? ""
                : "hidden"
            } ${
              pcChatOpen
                ? "md:translate-x-0"
                : "md:translate-x-full"
            }`}
            style={{
              WebkitOverflowScrolling:
                "touch",
              scrollbarWidth: "none",
            }}
          >
            <div className="flex min-h-full flex-col">
              {/* FLATLIVE_MANAGER_PC_CHAT_TOP_V9 */}
              <WatchManagerControls
                roomId={roomId}
                viewerCount={viewerCount}
              />

              <div className="mb-2 text-[11px] text-zinc-300">
              <strong className="mr-2 text-flat-yellow">
                FLATLIVE
              </strong>
              즐거운 방송을 위해 채팅 매너를 지켜주세요.
            </div>

            {activeDonationEffect?.mediaType ===
              "video" && (
              <div className="sticky top-0 z-30 mb-2 flex justify-start bg-zinc-950/90 py-1 backdrop-blur-sm">
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
                  className="max-h-[110px] w-auto max-w-[160px] object-contain md:max-h-[150px] md:max-w-[220px]"
                  onLoadedData={(event) => {
                    void event.currentTarget
                      .play()
                      .catch((error) => {
                        console.error(
                          "WATCH DONATION EFFECT PLAY ERROR:",
                          error,
                        );
                      });
                  }}
                  onEnded={() => {
                    setActiveDonationEffect(
                      null,
                    );

                    setActiveDonationEffectChatId(
                      "",
                    );
                  }}
                  onError={(event) => {
                    console.error(
                      "WATCH DONATION EFFECT VIDEO ERROR:",
                      event.currentTarget.src,
                    );

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

            <div
              ref={chatScrollRef}
              onScroll={handleChatScroll}
              className="h-full max-h-[calc(100dvh-170px)] space-y-1.5 overflow-y-auto overscroll-contain px-1 pb-4 pr-1 [-webkit-overflow-scrolling:touch]"
            >
              {visibleChatMessages.length === 0 ? (
                <div className="text-[11px] text-zinc-400">
                  아직 채팅이 없습니다.
                </div>
              ) : (
                visibleChatMessages.map(
                  (chat) => (
                    <div
                      key={chat.id}
                      className={[
                        "group px-2.5 py-2 text-[13px] leading-[19px] drop-shadow-sm transition-colors",
                        chat.isBroadcaster
                          ? "w-fit rounded-md border border-yellow-300/35 bg-yellow-300/[0.08] shadow-sm"
                          : "rounded-xl hover:bg-white/[0.045]",
                      ].join(" ")}
                    >
                      {chat.messageType ===
                      "RECOMMEND" ? (
                        <div className="inline-flex w-fit items-center rounded-xl border border-yellow-300/25 bg-yellow-300/10 px-3 py-2 text-[12px] font-black tracking-tight text-yellow-200 shadow-sm">
                          <span className="mr-1.5">
                            ♡
                          </span>
                          <span>
                            {chat.nickname ||
                              chat.username}
                            님 추천하셨습니다.
                          </span>
                        </div>
                      ) : (
                        <>
                          {!chat.isBroadcaster && (
                            <LiveLevelBadge label={chat.levelLabel} />
                          )}

                          {chat.loungeBadge && (
                            <span className="mr-1.5 rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 text-[11px] font-black text-white">
                              {chat.loungeBadge}
                            </span>
                          )}

                          {chat.nicknameTone === "VIP" ? (
                            <span className="mr-1">👑</span>
                          ) : chat.nicknameTone === "FAN" ? (
                            <span className="mr-1 text-rose-300">♥</span>
                          ) : chat.isManager && !chat.isBroadcaster ? (
                            <span className="mr-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-yellow-300/30 bg-yellow-300/10 px-1.5 text-[10px] font-black text-yellow-200">
                              M
                            </span>
                          ) : null}

                          <LiveChatUserMenu
                            mode="viewer"
                            roomId={roomId}
                            viewerId={chat.viewerId}
                            userId={chat.userId}
                            username={chat.username}
                            nickname={chat.nickname}
                            isBroadcaster={chat.isBroadcaster}
                            isManager={chat.isManager}
                            triggerClassName={[
                              "mr-2 inline font-black tracking-tight underline-offset-2 hover:underline",
                              chat.nicknameTone === "BROADCASTER"
                                ? "text-yellow-300"
                                : chat.nicknameTone === "VIP"
                                  ? "text-fuchsia-300"
                                  : chat.nicknameTone === "FAN"
                                    ? "text-amber-300"
                                    : chat.isManager
                                      ? "text-amber-400"
                                      : "text-zinc-100",
                            ].join(" ")}
                          >
                            {chat.nickname || chat.username}
                          </LiveChatUserMenu>

                          <span
                            className={
                              chat.isBroadcaster
                                ? "font-semibold text-yellow-200"
                                : chat.isManager
                                  ? "font-semibold text-amber-300"
                                  : "text-zinc-200"
                            }
                          >
                            {chat.message}
                          </span>
                        </>
                      )}

                      {(chat.donationMode === "repeat" ||
                        chat.donationMode === "sequence") && (
                        <DonationChatStaticEffect
                          message={chat.message}
                        />
                      )}

                    </div>
                  ),
                )
              )}

              <div
                ref={chatBottomRef}
                className="h-16 shrink-0 md:h-4"
              />
            </div>
            </div>
          </div>

          {pcChatOpen &&
            showLatestChatButton && (
              <button
                type="button"
                onClick={goToLatestChat}
                className="pointer-events-auto fixed bottom-[calc(110px+env(safe-area-inset-bottom))] right-5 z-[60000] hidden items-center rounded-full border border-yellow-300/35 bg-yellow-400 px-4 py-2 text-sm font-black text-black shadow-2xl shadow-yellow-400/20 transition hover:scale-[1.02] active:scale-95 md:flex"
                aria-label="최신 채팅으로 이동"
              >
                <span className="text-base leading-none">
                  ↓
                </span>

                <span>
                  새 채팅
                  {latestChatCount > 0
                    ? ` ${latestChatCount}개`
                    : ""}
                </span>
              </button>
            )}

          {/* FLATLIVE_MANAGER_VIEWERLIST_SYNC_V2 - PC manager viewer list */}
          {managerViewerAccess && (
            <>
              <button
                type="button"
                onClick={() => {
                  setPcManagerViewerSheetOpen(true);
                  void loadMobileViewerSheet();
                }}
                className="fixed right-4 top-20 z-[90000] hidden h-10 items-center gap-2 rounded-full border border-white/10 bg-black/80 px-4 text-xs font-black text-white shadow-2xl backdrop-blur-md md:flex"
                aria-label="매니저 시청자 목록 열기"
              >
                <span>👥</span>
                <span>시청자 {viewerCount}명</span>
              </button>

              {pcManagerViewerSheetOpen && (
                <div className="fixed inset-0 z-[90000] hidden md:block">
                  <button
                    type="button"
                    className="absolute inset-0 bg-black/30"
                    aria-label="매니저 시청자 목록 닫기"
                    onClick={() => setPcManagerViewerSheetOpen(false)}
                  />

                  <aside className="absolute right-5 top-5 flex max-h-[calc(100vh-40px)] w-[360px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                      <div>
                        <div className="text-sm font-black">시청자 목록</div>
                        <div className="mt-1 text-xs text-zinc-400">현재 {viewerCount}명 시청 중</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPcManagerViewerSheetOpen(false)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-xl text-zinc-300 hover:bg-white/10"
                        aria-label="시청자 목록 닫기"
                      >
                        ×
                      </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-4">
                      {managerViewerError ? (
                        <div className="py-10 text-center text-sm font-bold text-red-400">{managerViewerError}</div>
                      ) : mobileViewerSheetLoading && mobileViewerSheetList.length === 0 ? (
                        <div className="py-10 text-center text-sm font-bold text-zinc-500">시청자 불러오는 중...</div>
                      ) : mobileViewerSheetList.length === 0 ? (
                        <div className="py-10 text-center text-sm font-bold text-zinc-500">현재 시청자가 없습니다.</div>
                      ) : (
                        <div className="space-y-2">
                          {mobileViewerSheetList.map((viewer, index) => {
                            const displayName = viewer.nickname || viewer.username || "게스트";
                            return (
                              <div
                                key={viewer.viewerId || `${displayName}-${index}`}
                                className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5"
                              >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-xs font-black text-zinc-300">
                                  {viewer.avatarUrl ? (
                                    <img src={viewer.avatarUrl} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    displayName.slice(0, 1).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="truncate text-sm font-black">{displayName}</span>
                                    {viewer.isManager && (
                                      <span className="rounded-full bg-yellow-400/15 px-2 py-0.5 text-[10px] font-black text-yellow-300">매니저</span>
                                    )}
                                    {viewer.isSelf && (
                                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black text-zinc-300">나</span>
                                    )}
                                  </div>
                                  <div className="mt-0.5 truncate text-[11px] text-zinc-500">
                                    {viewer.username ? `@${viewer.username}` : viewer.isGuest ? "게스트" : "회원"}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </aside>
                </div>
              )}
            </>
          )}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setPcChatOpen((open) => !open);
            }}
            className={`absolute top-1/2 z-[300] hidden h-12 w-8 -translate-y-1/2 items-center justify-center rounded-l-xl border border-white/10 bg-zinc-900/95 text-xl text-white shadow-xl backdrop-blur-md transition-[right] duration-300 md:flex ${
              pcChatOpen
                ? "right-[352px]"
                : "right-0"
            }`}
            aria-label={
              pcChatOpen
                ? "채팅창 닫기"
                : "채팅창 열기"
            }
          >
            {pcChatOpen ? "›" : "‹"}
          </button>

          <form
            onSubmit={sendChat}
            className={`absolute bottom-0 right-0 z-[200] hidden h-[72px] w-[360px] items-center gap-2 border-l border-t border-white/10 bg-zinc-950 px-4 md:flex md:transition-transform md:duration-300 ${
              pcChatOpen
                ? "md:translate-x-0"
                : "md:translate-x-full"
            }`}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(event) => {
                setChatInput(event.target.value);

                if (chatError) {
                  setChatError("");
                }
              }}
              maxLength={300}
              placeholder="채팅을 입력하세요"
              className="h-11 min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.055] px-4 text-[13px] text-white outline-none transition placeholder:text-zinc-500 focus:border-yellow-300/60 focus:bg-white/[0.075]"
            />

            <button
              type="submit"
              disabled={
                chatSending ||
                !chatInput.trim()
              }
              className="h-11 shrink-0 rounded-2xl bg-yellow-300 px-4 text-[13px] font-black text-black shadow-lg transition hover:bg-yellow-200 active:scale-[0.97] disabled:opacity-40"
            >
              전송
            </button>
          </form>


          <div className={`pointer-events-auto fixed bottom-24 right-3 z-[300] flex flex-col items-center gap-4 md:hidden ${
              pcChatOpen
                ? "md:right-[380px]"
                : "md:right-5"
            }`}>
            <button
              type="button"
              onClick={() => {
                void handleLiveLike();
              }}
              disabled={
                liveLikeSending ||
                liveLiked
              }
              className="pointer-events-auto flex flex-col items-center text-xs disabled:opacity-70"
            >
              <span
                className={[
                  "flex h-11 w-11 items-center justify-center rounded-full text-xl backdrop-blur-md transition",
                  liveLiked
                    ? "bg-flat-yellow text-black"
                    : "bg-black/45 text-white",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {liveLiked ? "♥" : "♡"}
              </span>

              <span
                className={[
                  "mt-1 text-[9px]",
                  liveLiked
                    ? "font-bold text-flat-yellow"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                좋아요
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                void handleLiveShare();
              }}
              className="relative z-[300] flex flex-col items-center text-xs"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-lg backdrop-blur-md">
                ↗
              </span>
              <span className="mt-1 text-[9px]">
                공유
              </span>
            </button>

            <a
              href="/lounge"
              className="relative z-[300] flex flex-col items-center text-xs"
              aria-label="플랫라운지"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-[11px] font-black text-white backdrop-blur-md">
                라운지
              </span>
              <span className="mt-1 text-[9px]">
                라운지
              </span>
            </a>

            <button
              type="button"
              onClick={openDonation}
              className="relative z-[300] flex flex-col items-center text-xs"
              aria-label="선물"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-flat-yellow text-xl text-black shadow-[0_0_24px_rgba(255,205,0,.25)]">
                🎁
              </span>
              <span className="mt-1 text-[9px] font-bold text-flat-yellow">
                선물
              </span>
            </button>


            <button
              type="button"
              onClick={openChatInput}
              className="relative z-[300] pointer-events-auto touch-manipulation flex flex-col items-center text-xs md:hidden"
              style={{
                WebkitTapHighlightColor: "transparent",
              }}
              aria-label="채팅 열기"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-xl backdrop-blur-md">
                💬
              </span>
              <span className="mt-1 text-[9px]">
                채팅
              </span>
            </button>


          </div>
          {donationOpen && (
            <div
              className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70 px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))] backdrop-blur-sm md:p-4"
              onClick={() => {
                if (
                  autoDonationRunning ||
                  !donationBusy
                ) {
                  setDonationOpen(false);
                }
              }}
            >
              <div
                className="max-h-[calc(100dvh-150px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-md overflow-y-auto rounded-[24px] border border-white/10 bg-[#111] p-5 shadow-2xl md:max-h-[90vh]"
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-flat-yellow">
                      LIVE 선물
                    </p>
                    <h3 className="mt-1 text-xl font-black text-white">
                      {broadcasterName}님에게 후원
                    </h3>
                  </div>

                  <button
                    type="button"
                    disabled={
                      donationBusy &&
                      !autoDonationRunning
                    }
                    onClick={() =>
                      setDonationOpen(false)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white disabled:opacity-40"
                    aria-label="후원창 닫기"
                  >
                    ×
                  </button>
                </div>

                {/* 선물 방식 선택 */}
                <div className="mt-5 grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    disabled={autoDonationRunning}
                    onClick={() => {
                      setAutoDonationMode("single");
                      setDonationMessage("");
                      setDonationTraceId("");
                    }}
                    className={`h-11 rounded-xl border text-xs font-black ${
                      autoDonationMode === "single"
                        ? "border-flat-yellow bg-flat-yellow text-black"
                        : "border-white/10 bg-white/[0.05] text-zinc-300"
                    }`}
                  >
                    일반 선물
                  </button>

                  <button
                    type="button"
                    disabled={autoDonationRunning}
                    onClick={() => {
                      setAutoDonationMode("repeat");
                      setDonationMessage("");
                      setDonationTraceId("");
                    }}
                    className={`h-11 rounded-xl border text-xs font-black ${
                      autoDonationMode === "repeat"
                        ? "border-flat-yellow bg-flat-yellow text-black"
                        : "border-white/10 bg-white/[0.05] text-zinc-300"
                    }`}
                  >
                    반복 선물
                  </button>

                  <button
                    type="button"
                    disabled={autoDonationRunning}
                    onClick={() => {
                      setAutoDonationMode("sequence");
                      setDonationMessage("");
                      setDonationTraceId("");
                    }}
                    className={`h-11 rounded-xl border text-xs font-black ${
                      autoDonationMode === "sequence"
                        ? "border-flat-yellow bg-flat-yellow text-black"
                        : "border-white/10 bg-white/[0.05] text-zinc-300"
                    }`}
                  >
                    순차 선물
                  </button>

                  <button
                    type="button"
                    disabled={autoDonationRunning}
                    onClick={() => {
                      setAutoDonationMode("special");
                      setDonationMessage("");
                      setDonationTraceId("");
                    }}
                    className={`h-11 rounded-xl border text-xs font-black ${
                      autoDonationMode === "special"
                        ? "border-amber-300 bg-amber-300 text-black"
                        : "border-white/10 bg-white/[0.05] text-zinc-300"
                    }`}
                  >
                    보물독
                  </button>
                </div>

                {/* 일반 선물 */}
                {autoDonationMode === "single" && (
                  <div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {[100, 500, 1000, 5000].map(
                        (amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => {
                              setDonationAmount(amount);
                              setDonationMessage("");
                              setDonationTraceId("");
                            }}
                            className={`rounded-2xl border px-4 py-3 text-sm font-black ${
                              donationAmount === amount
                                ? "border-flat-yellow bg-flat-yellow text-black"
                                : "border-white/10 bg-white/[0.05] text-white"
                            }`}
                          >
                            {amount.toLocaleString()} FLAT
                          </button>
                        ),
                      )}
                    </div>

                    <div className="mt-3">
                      <label
                        htmlFor="custom-donation-amount"
                        className="mb-2 block text-xs font-bold text-zinc-400"
                      >
                        원하는 금액
                      </label>

                      <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.05] px-4">
                        <input
                          id="custom-donation-amount"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={
                            donationAmount > 0
                              ? donationAmount.toString()
                              : ""
                          }
                          onChange={(event) => {
                            const digits =
                              event.target.value.replace(
                                /[^0-9]/g,
                                "",
                              );

                            if (!digits) {
                              setDonationAmount(0);
                              setDonationMessage("");
                              setDonationTraceId("");
                              return;
                            }

                            const nextAmount =
                              Number(digits);

                            if (
                              !Number.isSafeInteger(
                                nextAmount,
                              )
                            ) {
                              setDonationMessage(
                                "입력 금액이 너무 큽니다.",
                              );
                              return;
                            }

                            setDonationAmount(
                              nextAmount,
                            );
                            setDonationMessage("");
                            setDonationTraceId("");
                          }}
                          placeholder="직접 금액 입력"
                          disabled={
                            donationBusy ||
                            autoDonationRunning
                          }
                          className="min-w-0 flex-1 bg-transparent py-3.5 text-base font-black text-white outline-none placeholder:text-zinc-600 disabled:opacity-40"
                        />

                        <span className="ml-3 text-sm font-black text-flat-yellow">
                          FLAT
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={
                        donationBusy ||
                        autoDonationRunning ||
                        !broadcasterUserId ||
                        donationAmount < 1 ||
                        !Number.isSafeInteger(
                          donationAmount,
                        )
                      }
                      onClick={sendDonation}
                      className="mt-4 w-full rounded-2xl bg-flat-yellow px-4 py-3.5 text-sm font-black text-black disabled:opacity-40"
                    >
                      {donationBusy
                        ? "후원 처리 중..."
                        : `${donationAmount.toLocaleString()} FLAT 후원하기`}
                    </button>
                  </div>
                )}

                {/* 보물독 / 포털독 특별 선물 */}
                {autoDonationMode === "special" && (
                  <TreasureJarGiftPanel
                    roomId={roomId}
                    onDone={() => {
                      void loadDonationBalance();
                      setDonationOpen(false);
                    }}
                  />
                )}

                {/* 반복 선물 */}
                {autoDonationMode === "repeat" && (
                  <div className="mt-4">
                    <div className="grid grid-cols-3 gap-2">
                      <label>
                        <span className="mb-1.5 block text-[11px] font-bold text-zinc-400">
                          금액
                        </span>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={autoRepeatAmount}
                          disabled={autoDonationRunning}
                          onChange={(event) =>
                            setAutoRepeatAmount(
                              event.target.value.replace(
                                /[^0-9]/g,
                                "",
                              ),
                            )
                          }
                          placeholder="100"
                          className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.05] px-2 text-center text-sm font-black text-white outline-none focus:border-flat-yellow"
                        />
                      </label>

                      <label>
                        <span className="mb-1.5 block text-[11px] font-bold text-zinc-400">
                          횟수
                        </span>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={autoRepeatCount}
                          disabled={autoDonationRunning}
                          onChange={(event) =>
                            setAutoRepeatCount(
                              event.target.value.replace(
                                /[^0-9]/g,
                                "",
                              ),
                            )
                          }
                          placeholder="5"
                          className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.05] px-2 text-center text-sm font-black text-white outline-none focus:border-flat-yellow"
                        />
                      </label>

                      <label>
                        <span className="mb-1.5 block text-[11px] font-bold text-zinc-400">
                          간격
                        </span>

                        <select
                          value={autoDonationInterval}
                          disabled={autoDonationRunning}
                          onChange={(event) =>
                            setAutoDonationInterval(
                              Number(
                                event.target.value,
                              ),
                            )
                          }
                          className="h-11 w-full rounded-xl border border-white/10 bg-[#181818] px-2 text-center text-sm font-bold text-white outline-none"
                        >
                          <option value={1}>
                            1초
                          </option>
                          <option value={3}>
                            3초
                          </option>
                          <option value={5}>
                            5초
                          </option>
                          <option value={10}>
                            10초
                          </option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">
                        같은 금액을 반복 전송
                      </span>

                      <span className="font-bold text-zinc-400">
                        예상{" "}
                        <strong className="text-flat-yellow">
                          {(() => {
                            const total =
                              Number(
                                autoRepeatAmount,
                              ) *
                              Number(
                                autoRepeatCount,
                              );

                            return Number.isSafeInteger(
                              total,
                            ) &&
                              total > 0
                              ? `${total.toLocaleString()} FLAT`
                              : "-";
                          })()}
                        </strong>
                      </span>
                    </div>

                    {autoDonationRunning ? (
                      <button
                        type="button"
                        onClick={stopAutoDonation}
                        className="mt-4 h-11 w-full rounded-xl bg-red-500 text-sm font-black text-white"
                      >
                        자동 선물 중지
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={
                          donationBusy ||
                          !broadcasterUserId
                        }
                        onClick={startRepeatDonation}
                        className="mt-4 h-11 w-full rounded-xl bg-flat-yellow text-sm font-black text-black disabled:opacity-40"
                      >
                        반복 자동 선물 시작
                      </button>
                    )}
                  </div>
                )}

                {/* 순차 선물 */}
                {autoDonationMode === "sequence" && (
                  <div className="mt-4">
                    <div className="grid grid-cols-4 gap-2">
                      <label>
                        <span className="mb-1.5 block text-[11px] font-bold text-zinc-400">
                          시작
                        </span>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={autoSequenceStart}
                          disabled={autoDonationRunning}
                          onChange={(event) =>
                            setAutoSequenceStart(
                              event.target.value.replace(
                                /[^0-9]/g,
                                "",
                              ),
                            )
                          }
                          className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.05] px-1 text-center text-sm font-black text-white outline-none focus:border-flat-yellow"
                        />
                      </label>

                      <label>
                        <span className="mb-1.5 block text-[11px] font-bold text-zinc-400">
                          끝
                        </span>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={autoSequenceEnd}
                          disabled={autoDonationRunning}
                          onChange={(event) =>
                            setAutoSequenceEnd(
                              event.target.value.replace(
                                /[^0-9]/g,
                                "",
                              ),
                            )
                          }
                          className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.05] px-1 text-center text-sm font-black text-white outline-none focus:border-flat-yellow"
                        />
                      </label>

                      <label>
                        <span className="mb-1.5 block text-[11px] font-bold text-zinc-400">
                          증가
                        </span>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={autoSequenceStep}
                          disabled={autoDonationRunning}
                          onChange={(event) =>
                            setAutoSequenceStep(
                              event.target.value.replace(
                                /[^0-9]/g,
                                "",
                              ),
                            )
                          }
                          className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.05] px-1 text-center text-sm font-black text-white outline-none focus:border-flat-yellow"
                        />
                      </label>

                      <label>
                        <span className="mb-1.5 block text-[11px] font-bold text-zinc-400">
                          간격
                        </span>

                        <select
                          value={autoDonationInterval}
                          disabled={autoDonationRunning}
                          onChange={(event) =>
                            setAutoDonationInterval(
                              Number(
                                event.target.value,
                              ),
                            )
                          }
                          className="h-11 w-full rounded-xl border border-white/10 bg-[#181818] px-1 text-center text-xs font-bold text-white outline-none"
                        >
                          <option value={1}>
                            1초
                          </option>
                          <option value={3}>
                            3초
                          </option>
                          <option value={5}>
                            5초
                          </option>
                          <option value={10}>
                            10초
                          </option>
                        </select>
                      </label>
                    </div>

                    <p className="mt-2 text-[11px] text-zinc-500">
                      시작 금액부터 증가 금액만큼 올려 끝 금액까지 전송합니다.
                    </p>

                    {autoDonationRunning ? (
                      <button
                        type="button"
                        onClick={stopAutoDonation}
                        className="mt-4 h-11 w-full rounded-xl bg-red-500 text-sm font-black text-white"
                      >
                        자동 선물 중지
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={
                          donationBusy ||
                          !broadcasterUserId
                        }
                        onClick={startSequenceDonation}
                        className="mt-4 h-11 w-full rounded-xl bg-flat-yellow text-sm font-black text-black disabled:opacity-40"
                      >
                        순차 자동 선물 시작
                      </button>
                    )}
                  </div>
                )}

                {autoDonationProgress &&
                  autoDonationMode !== "single" && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center text-[11px] font-bold text-zinc-300">
                      {autoDonationProgress}
                    </div>
                  )}

                {donationMessage && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-zinc-200">
                    {donationMessage}

                    {donationTraceId && (
                      <div className="mt-2 break-all text-[10px] text-zinc-500">
                        Trace ID:{" "}
                        {donationTraceId}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold text-zinc-500">
                        현재 보유 FLAT
                      </p>

                      <p className="mt-1 text-base font-black text-flat-yellow">
                        {donationBalanceLoading
                          ? "불러오는 중..."
                          : donationBalance !== null
                            ? `${donationBalance.toLocaleString()} FLAT`
                            : "확인할 수 없음"}
                      </p>
                    </div>

                    <a
                      href="/charge"
                      className="shrink-0 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-black text-black transition hover:bg-yellow-300"
                    >
                      충전
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

{speakerControlsVisible && (
            <div
              className="pointer-events-auto fixed left-4 bottom-[calc(100px+env(safe-area-inset-bottom))] z-[99999] md:absolute md:left-[clamp(12px,3.5vw,22px)] md:bottom-[clamp(14px,3.5vw,24px)] md:z-[1000]"
              onPointerUp={(event) => {
                event.stopPropagation();
              }}
            >
              {volumeOpen && (
                <div
                  className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 rounded-2xl border border-white/15 bg-black/90 px-3 py-4 shadow-xl backdrop-blur-xl"
                >
                  <input
                    aria-label="볼륨"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={muted ? 0 : volume}
                    onChange={(event) =>
                      changeVolume(
                        Number(event.target.value),
                      )
                    }
                    className="h-28 w-6"
                    style={{
                      writingMode: "vertical-lr",
                      direction: "rtl",
                    }}
                  />
                </div>
              )}

              <button
                type="button"
                onPointerUp={(event) => {
                  event.stopPropagation();

                  if (muted || volume === 0) {
                    void enableSound();
                    return;
                  }

                  setVolumeOpen((open) => !open);
                }}
                className="relative z-[300] flex items-center justify-center rounded-full border border-white/20 bg-black/70 text-white shadow-lg backdrop-blur-md"
                style={{
                  width: "clamp(40px, 10vw, 50px)",
                  height: "clamp(40px, 10vw, 50px)",
                  fontSize: "clamp(18px, 5vw, 23px)",
                }}
                aria-label="소리 조절"
              >
                {muted || volume === 0
                  ? "🔇"
                  : volume < 0.5
                    ? "🔉"
                    : "🔊"}
              </button>
            </div>
          )}

          {chatOpen &&
            !viewerChatMuted &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                className="pointer-events-none fixed inset-x-0 z-[2147483647] bg-[#111] px-2 py-2"
                style={{
                  top:
                    keyboardTop !== null
                      ? `${Math.max(0, keyboardTop - 64)}px`
                      : "auto",
                  bottom:
                    keyboardTop !== null
                      ? "auto"
                      : "0px",
                }}
              >
                <form
                  onSubmit={sendChat}
                  className="pointer-events-auto mx-auto flex h-12 w-full max-w-md items-center gap-2"
                >
                  <input
                    ref={chatInputRef}
                    type="text"
                    enterKeyHint="send"
                    value={chatInput}
                    onChange={(event) => {
                      setChatInput(event.target.value);

                      if (chatError) {
                        setChatError("");
                      }
                    }}
                    maxLength={300}
                    disabled={
                      viewerChatMuted
                    }
                    placeholder={
                      viewerChatMuted
                        ? "채팅이 금지되었습니다."
                        : "채팅하기"
                    }
                    className="h-11 min-w-0 flex-1 rounded-xl border border-white/20 bg-zinc-900 px-4 text-[16px] text-white caret-white outline-none placeholder:text-zinc-400 focus:border-yellow-400"
                  />

                  <button
                    type="submit"
                    disabled={
                      viewerChatMuted ||
                      chatSending ||
                      !chatInput.trim()
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-xl font-black text-black disabled:opacity-40"
                    aria-label="전송"
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setChatOpen(false);

                      const mobileNav =
                        document.querySelector<HTMLElement>(
                          '[data-flat-mobile-nav="true"]',
                        );

                      if (mobileNav) {
                        mobileNav.style.display = "";
                      }
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl text-white"
                    aria-label="채팅 닫기"
                  >
                    ×
                  </button>
                </form>
              </div>,
              document.body,
            )}

          
        </section>

        <ReportModal
          open={reportOpen}
          onClose={() => {
            setReportOpen(false);
          }}
          targetType="LIVE"
          targetId={roomId}
          targetOwnerUserId={broadcasterUserId}
          targetTitle={
            liveTitle ||
            `${broadcasterName} LIVE`
          }
        />

        {error && (
          <div className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-xl border border-red-500/20 bg-red-950/95 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {chatError && (
          <div className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-xl border border-red-500/20 bg-red-950/95 p-3 text-xs text-red-300">
            {chatError}
          </div>
        )}


      </div>
    </main>
  );
}

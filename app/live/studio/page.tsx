"use client";

import ClutchVideoGrid from "@/app/live/match/ClutchVideoGrid";
import useClutchRemoteStreams from "@/app/live/match/useClutchRemoteStreams";
import type { LiveMatch } from "@/lib/live/match/match-types";
import StudioMobileOverlay from "./StudioMobileOverlay";
import StudioChatOverlay from "./StudioChatOverlay";
import StudioViewerList from "./StudioViewerList";
import StudioPcChatPanel from "./StudioPcChatPanel";
import StudioBroadcastControls from "./StudioBroadcastControls";
import StudioStopLiveModal from "./StudioStopLiveModal";
import MatchPanel from "../match/MatchPanel";
import { useStudioVideoContentRect } from "./useStudioVideoContentRect";
import TreasureJarOverlay from "@/app/live/common/TreasureJarOverlay";


import { ensureCreatorConsent } from "@/lib/creator/ensure-creator-consent";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import LiveLevelBadge from "@/app/live/common/LiveLevelBadge";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

const ACTIVE_ROOM_STORAGE_KEY =
  "flatlive-active-room-id";

type LiveChatMessage = {
  id: string;
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

type LiveViewerInfo = {
  viewerId: string;
  userId: string;
  username: string;
  nickname: string;
  avatarUrl: string;
  isGuest: boolean;
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

const studioDonationStaticEffectCache =
  new Map<number, DonationEffect | null>();

const studioDonationStaticEffectPending =
  new Map<
    number,
    Promise<DonationEffect | null>
  >();

const studioDonationStaticFrameCache =
  new Map<string, string>();

const studioDonationStaticFramePending =
  new Map<string, Promise<string>>();

function getStudioDonationStaticFrame(
  effect: DonationEffect,
): Promise<string> {
  if (effect.mediaType === "image") {
    return Promise.resolve(
      effect.mediaUrl,
    );
  }

  const cached =
    studioDonationStaticFrameCache.get(
      effect.mediaUrl,
    );

  if (cached) {
    return Promise.resolve(cached);
  }

  const existing =
    studioDonationStaticFramePending.get(
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
          video.removeAttribute("src");
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

            studioDonationStaticFrameCache.set(
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
    ).finally(() => {
      studioDonationStaticFramePending.delete(
        effect.mediaUrl,
      );
    });

  studioDonationStaticFramePending.set(
    effect.mediaUrl,
    pending,
  );

  return pending;
}

function StudioDonationChatStaticEffect({
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
          studioDonationStaticEffectCache.get(
            amount,
          );

        if (effect === undefined) {
          let pending =
            studioDonationStaticEffectPending.get(
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
                  studioDonationStaticEffectCache.set(
                    amount,
                    nextEffect,
                  );

                  return nextEffect;
                },
              )
              .finally(() => {
                studioDonationStaticEffectPending.delete(
                  amount,
                );
              });

            studioDonationStaticEffectPending.set(
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
          await getStudioDonationStaticFrame(
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
          "STUDIO DONATION STATIC IMAGE ERROR:",
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

export default function LiveStudioPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const studioVideoContentRect =
    useStudioVideoContentRect(
      videoRef,
    );


  const peersRef = useRef(
    new Map<string, RTCPeerConnection>(),
  );

  const roomTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const heartbeatTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const answerTimersRef = useRef(
    new Map<string, ReturnType<typeof setInterval>>(),
  );

  // FLATLIVE_WEBRTC_DISCONNECT_RECOVERY_V1
  const disconnectTimersRef = useRef(
    new Map<
      string,
      ReturnType<typeof setTimeout>
    >(),
  );

  const creatingViewersRef = useRef(
    new Set<string>(),
  );

  const restoringRef = useRef(false);

  const [status, setStatus] =
    useState("방송 준비");

  const [cameraOn, setCameraOn] =
    useState(false);

  const [micOn, setMicOn] =
    useState(false);

  const [videoInfo, setVideoInfo] =
    useState("");

  const [roomId, setRoomId] =
    useState("");

  // FLATLIVE_MATCH_MEDIA_FIX3
  const [
    liveMatch,
    setLiveMatch,
  ] = useState<LiveMatch | null>(
    null,
  );

  // FLATLIVE_CLUTCH_MULTI_GRID_STUDIO_V1
  const {
    streams:
      clutchRemoteStreams,
  } = useClutchRemoteStreams({
    match: liveMatch,
    excludeRoomIds:
      roomId
        ? [roomId]
        : [],
  });


  const [
    liveElapsedSeconds,
    setLiveElapsedSeconds,
  ] = useState(0);

  const liveStartedAtRef =
    useRef<number | null>(null);

  const [liveStarting, setLiveStarting] =
    useState(false);

  const [viewerCount, setViewerCount] =
    useState(0);

  const [viewerList, setViewerList] =
    useState<LiveViewerInfo[]>([]);

  const [
    studioLiveTitleEdit,
    setStudioLiveTitleEdit,
  ] = useState("");

  const [
    studioLiveTitleSaving,
    setStudioLiveTitleSaving,
  ] = useState(false);

  const [
    studioLiveTitleMessage,
    setStudioLiveTitleMessage,
  ] = useState("");


  const [followerCount, setFollowerCount] =
    useState(0);

  // FLATLIVE_STUDIO_TITLE_LOAD
  useEffect(() => {
    if (!roomId) {
      setStudioLiveTitleEdit("");
      setStudioLiveTitleMessage("");
      return;
    }

    let cancelled = false;

    const loadCurrentLiveTitle =
      async () => {
        try {
          const response =
            await fetch(
              `/api/live/signal?roomId=${encodeURIComponent(
                roomId,
              )}`,
              {
                cache: "no-store",
              },
            );

          if (
            !response.ok ||
            cancelled
          ) {
            return;
          }

          const data =
            await response.json();

          if (
            typeof data.title ===
              "string" &&
            !cancelled
          ) {
            setStudioLiveTitleEdit(
              data.title,
            );
          }
        } catch (error) {
          console.warn(
            "LIVE TITLE LOAD FAILED:",
            error,
          );
        }
      };

    void loadCurrentLiveTitle();

    return () => {
      cancelled = true;
    };
  }, [roomId]);


  const followerUserIdRef =
    useRef("");

  const followerLastFetchRef =
    useRef(0);

  const [error, setError] =
    useState("");

  const [liveTitle, setLiveTitle] =
    useState("");

  const [liveCategory, setLiveCategory] =
    useState("토크");

  const [isAdult, setIsAdult] =
    useState(false);

  const [chatMessages, setChatMessages] =
    useState<LiveChatMessage[]>([]);

  const [chatInput, setChatInput] =
    useState("");

  const [chatSending, setChatSending] =
    useState(false);

  const [viewerPanelOpen, setViewerPanelOpen] =
    useState(false);

  const [chatError, setChatError] =
    useState("");

  // FLATLIVE_CHAT_OVERLAY_STATE
  const [chatOverlayEnabled, setChatOverlayEnabled] =
    useState(true);

  const [chatOverlayPosition, setChatOverlayPosition] =
    useState<
      "top-left" |
      "top-right" |
      "bottom-left" |
      "bottom-right"
    >("bottom-left");

  const [chatOverlaySize, setChatOverlaySize] =
    useState<"small" | "medium" | "large">(
      "medium",
    );

  const [chatOverlayCount, setChatOverlayCount] =
    useState<3 | 5 | 10>(5);

  const [chatOverlayOpacity, setChatOverlayOpacity] =
    useState<50 | 70 | 90>(70);

  // FLATLIVE_CHAT_OVERLAY_DRAG_POSITION
  const [chatOverlayX, setChatOverlayX] =
    useState(8);

  const [chatOverlayY, setChatOverlayY] =
    useState(72);

  // FLATLIVE_CHAT_OVERLAY_SERVER_SYNC
  useEffect(() => {
    if (!roomId) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        void fetch(
          "/api/live/signal",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action:
                "update-chat-overlay",
              roomId,
              enabled:
                chatOverlayEnabled,
              position:
                chatOverlayPosition,
              size:
                chatOverlaySize,
              count:
                chatOverlayCount,
              opacity:
                chatOverlayOpacity,
              x:
                chatOverlayX,
              y:
                chatOverlayY,
            }),
          },
        ).catch((error) => {
          console.error(
            "CHAT OVERLAY SYNC FAILED:",
            error,
          );
        });
      }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    roomId,
    chatOverlayEnabled,
    chatOverlayPosition,
    chatOverlaySize,
    chatOverlayCount,
    chatOverlayOpacity,
    chatOverlayX,
    chatOverlayY,
  ]);

  const chatTimerRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null,
    );

  const chatBottomRef =
    useRef<HTMLDivElement>(null);

  const [giftAlertMessage, setGiftAlertMessage] =
    useState("");

  const giftAlertTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const lastGiftChatIdRef =
    useRef("");

  const giftPollingInitializedRef =
    useRef(false);

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

  const [exitConfirmOpen, setExitConfirmOpen] =
    useState(false);

  const [exitAfterStop, setExitAfterStop] =
    useState(false);

  const [
    pendingExitHref,
    setPendingExitHref,
  ] = useState("");

  const [stoppingLive, setStoppingLive] =
    useState(false);

  const [stopLiveError, setStopLiveError] =
    useState("");

  // FLATLIVE_LIVE_ELAPSED_TIMER
  useEffect(() => {
    if (!roomId) {
      liveStartedAtRef.current =
        null;

      setLiveElapsedSeconds(0);

      return;
    }

    if (
      liveStartedAtRef.current ===
      null
    ) {
      liveStartedAtRef.current =
        Date.now();
    }

    const updateElapsed = () => {
      if (
        liveStartedAtRef.current ===
        null
      ) {
        return;
      }

      setLiveElapsedSeconds(
        Math.max(
          0,
          Math.floor(
            (
              Date.now() -
              liveStartedAtRef.current
            ) / 1000,
          ),
        ),
      );
    };

    updateElapsed();

    const timer =
      window.setInterval(
        updateElapsed,
        1000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [roomId]);

  const formattedLiveTime =
    [
      Math.floor(
        liveElapsedSeconds /
          3600,
      ),
      Math.floor(
        (
          liveElapsedSeconds %
          3600
        ) / 60,
      ),
      liveElapsedSeconds %
        60,
    ]
      .map((value) =>
        String(value).padStart(
          2,
          "0",
        ),
      )
      .join(":");

  async function saveStudioLiveTitle() {
    const nextTitle =
      studioLiveTitleEdit.trim();

    if (!roomId) {
      setStudioLiveTitleMessage(
        "현재 방송 중이 아닙니다.",
      );
      return;
    }

    if (!nextTitle) {
      setStudioLiveTitleMessage(
        "방송 제목을 입력해주세요.",
      );
      return;
    }

    if (nextTitle.length > 100) {
      setStudioLiveTitleMessage(
        "방송 제목은 100자 이하로 입력해주세요.",
      );
      return;
    }

    try {
      setStudioLiveTitleSaving(true);
      setStudioLiveTitleMessage("");

      const response =
        await fetch(
          "/api/live/signal",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action: "update-title",
              roomId,
              title: nextTitle,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "방송 제목 수정에 실패했습니다.",
        );
      }

      setStudioLiveTitleEdit(
        typeof data.title === "string"
          ? data.title
          : nextTitle,
      );

      setStudioLiveTitleMessage(
        "저장됨",
      );

      window.setTimeout(() => {
        setStudioLiveTitleMessage("");
      }, 1800);
    } catch (error) {
      setStudioLiveTitleMessage(
        error instanceof Error
          ? error.message
          : "방송 제목 수정에 실패했습니다.",
      );
    } finally {
      setStudioLiveTitleSaving(false);
    }
  }

  async function startCamera() {
    try {
      setError("");
      setStatus("카메라 연결 중...");

      const existingStream =
        streamRef.current;

      if (existingStream) {
        existingStream
          .getTracks()
          .forEach((track) => track.stop());

        streamRef.current = null;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: true,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraOn(
        stream
          .getVideoTracks()
          .some((track) => track.enabled),
      );

      setMicOn(
        stream
          .getAudioTracks()
          .some((track) => track.enabled),
      );

      const settings =
        stream
          .getVideoTracks()[0]
          ?.getSettings();

      setVideoInfo(
        `${settings?.width ?? "?"} × ${
          settings?.height ?? "?"
        } / ${
          settings?.frameRate
            ? Math.round(settings.frameRate)
            : "?"
        }fps`,
      );

      const videoTrack =
        stream.getVideoTracks()[0];

      console.log("CAMERA TRACK DEBUG:", {
        enabled: videoTrack?.enabled,
        muted: videoTrack?.muted,
        readyState: videoTrack?.readyState,
        settings: videoTrack?.getSettings(),
      });

      setStatus(
        `방송 준비 완료 · VIDEO ${
          videoTrack?.enabled ? "ON" : "OFF"
        } · ${
          videoTrack?.muted ? "MUTED" : "ACTIVE"
        } · ${
          videoTrack?.readyState ?? "UNKNOWN"
        }`,
      );

      return true;
    } catch (err) {
      console.error(err);

      setStatus("연결 실패");

      setError(
        "카메라 또는 마이크 권한을 확인해주세요.",
      );

      return false;
    }
  }

  function toggleMicrophone() {
    const stream =
      streamRef.current;

    if (!stream) {
      setError(
        "먼저 카메라와 마이크를 켜주세요.",
      );
      return;
    }

    const audioTracks =
      stream.getAudioTracks();

    if (audioTracks.length === 0) {
      setError(
        "사용 가능한 마이크가 없습니다.",
      );
      setMicOn(false);
      return;
    }

    const currentlyEnabled =
      audioTracks.some(
        (track) => track.enabled,
      );

    const nextEnabled =
      !currentlyEnabled;

    audioTracks.forEach(
      (track) => {
        track.enabled =
          nextEnabled;
      },
    );

    setMicOn(nextEnabled);
    setError("");

    console.log(
      "STUDIO MICROPHONE:",
      nextEnabled
        ? "ON"
        : "OFF",
    );
  }

  async function waitForIceComplete(
    peer: RTCPeerConnection,
  ) {
    if (
      peer.iceGatheringState === "complete"
    ) {
      return;
    }

    await new Promise<void>((resolve) => {
      let finished = false;

      const finish = () => {
        if (finished) {
          return;
        }

        finished = true;

        peer.removeEventListener(
          "icegatheringstatechange",
          handler,
        );

        resolve();
      };

      const handler = () => {
        if (
          peer.iceGatheringState === "complete"
        ) {
          finish();
        }
      };

      peer.addEventListener(
        "icegatheringstatechange",
        handler,
      );

      setTimeout(finish, 8000);
    });
  }

  function clearAnswerTimer(
    viewerId: string,
  ) {
    const timer =
      answerTimersRef.current.get(viewerId);

    if (timer) {
      clearInterval(timer);

      answerTimersRef.current.delete(
        viewerId,
      );
    }
  }

  function closeViewerPeer(
    viewerId: string,
  ) {
    clearAnswerTimer(viewerId);

    const disconnectTimer =
      disconnectTimersRef.current.get(
        viewerId,
      );

    if (disconnectTimer) {
      clearTimeout(disconnectTimer);

      disconnectTimersRef.current.delete(
        viewerId,
      );
    }

    const peer =
      peersRef.current.get(viewerId);

    if (peer) {
      peer.close();

      peersRef.current.delete(viewerId);
    }

    creatingViewersRef.current.delete(
      viewerId,
    );

    setViewerCount(
      peersRef.current.size,
    );
  }

  async function createPeerForViewer(
    activeRoomId: string,
    viewerId: string,
  ) {
    const stream = streamRef.current;

    if (!stream) {
      return;
    }

    if (
      peersRef.current.has(viewerId) ||
      creatingViewersRef.current.has(
        viewerId,
      )
    ) {
      return;
    }

    creatingViewersRef.current.add(
      viewerId,
    );

    try {
      console.log(
        "VIEWER CONNECTION CREATE:",
        viewerId,
      );

      const peer =
        new RTCPeerConnection(
          ICE_SERVERS,
        );

      peersRef.current.set(
        viewerId,
        peer,
      );

      stream
        .getTracks()
        .forEach((track) => {
          peer.addTrack(
            track,
            stream,
          );
        });

      peer.oniceconnectionstatechange =
        () => {
          console.log(
            "VIEWER ICE:",
            viewerId,
            peer.iceConnectionState,
          );
        };

      peer.onconnectionstatechange =
        () => {
          console.log(
            "VIEWER CONNECTION:",
            viewerId,
            peer.connectionState,
          );

          if (
            peer.connectionState ===
            "connected"
          ) {
            const disconnectTimer =
              disconnectTimersRef.current.get(
                viewerId,
              );

            if (disconnectTimer) {
              clearTimeout(
                disconnectTimer,
              );

              disconnectTimersRef.current.delete(
                viewerId,
              );
            }

            setStatus(
              "● LIVE · 시청자 연결됨",
            );

            setViewerCount(
              peersRef.current.size,
            );
          }

          if (
            peer.connectionState ===
              "failed" ||
            peer.connectionState ===
              "closed"
          ) {
            closeViewerPeer(
              viewerId,
            );
          }

          if (
            peer.connectionState ===
            "disconnected"
          ) {
            setStatus(
              "● LIVE · 연결 복구 중...",
            );

            if (
              !disconnectTimersRef.current.has(
                viewerId,
              )
            ) {
              const disconnectTimer =
                setTimeout(() => {
                  disconnectTimersRef.current.delete(
                    viewerId,
                  );

                  const currentPeer =
                    peersRef.current.get(
                      viewerId,
                    );

                  if (
                    currentPeer === peer &&
                    peer.connectionState ===
                      "disconnected"
                  ) {
                    console.warn(
                      "VIEWER RECONNECT RESET:",
                      viewerId,
                    );

                    closeViewerPeer(
                      viewerId,
                    );
                  }
                }, 4000);

              disconnectTimersRef.current.set(
                viewerId,
                disconnectTimer,
              );
            }
          }
        };

      // FLATLIVE_WEBRTC_ANSWER_RACE_FIX_V1
      peer.onicecandidateerror =
        (event) => {
          // Candidate/STUN 오류 하나가 발생해도 다른 candidate로 연결될 수 있습니다.
          // Next.js dev error overlay가 방송 화면을 덮지 않도록 warning으로 기록합니다.
          console.warn(
            "ICE CANDIDATE WARNING:",
            viewerId,
            {
              errorCode: event.errorCode,
              errorText: event.errorText,
              url: event.url,
              address: event.address,
              port: event.port,
            },
          );
        };

      const offer =
        await peer.createOffer();

      await peer.setLocalDescription(
        offer,
      );
      await waitForIceComplete(
        peer,
      );

      const local =
        peer.localDescription;

      if (!local?.sdp) {
        throw new Error(
          "방송 연결 정보를 만들지 못했습니다.",
        );
      }

      const response =
        await fetch(
          "/api/live/signal",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action: "offer",
              roomId: activeRoomId,
              viewerId,
              description: {
                type: "offer",
                sdp: local.sdp,
              },
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "방송 연결정보 저장에 실패했습니다.",
        );
      }

      let answerApplying = false;

      const answerTimer =
        setInterval(async () => {
          try {
            if (answerApplying) {
              return;
            }

            const answerResponse =
              await fetch(
                `/api/live/signal?roomId=${encodeURIComponent(
                  activeRoomId,
                )}&viewerId=${encodeURIComponent(
                  viewerId,
                )}`,
                {
                  cache: "no-store",
                },
              );

            if (
              answerResponse.status ===
              404
            ) {
              closeViewerPeer(
                viewerId,
              );

              return;
            }

            if (
              !answerResponse.ok
            ) {
              return;
            }

            const answerData =
              await answerResponse.json();

            if (!answerData.answer?.sdp) {
              return;
            }

            // 이미 다른 poll tick이 answer 적용을 끝냈다면 더 이상 polling하지 않습니다.
            if (
              peer.signalingState ===
              "stable"
            ) {
              clearAnswerTimer(
                viewerId,
              );
              return;
            }

            if (
              peer.signalingState !==
              "have-local-offer"
            ) {
              return;
            }

            answerApplying = true;

            try {
              await peer.setRemoteDescription(
                {
                  type: "answer",
                  sdp:
                    answerData.answer
                      .sdp,
                },
              );

              clearAnswerTimer(
                viewerId,
              );
            } finally {
              answerApplying = false;
            }
          } catch (pollError) {
            // stable 상태는 중복 answer poll 경쟁에서 이미 정상 적용된 경우일 수 있습니다.
            if (
              peer.signalingState ===
              "stable"
            ) {
              clearAnswerTimer(
                viewerId,
              );
              return;
            }

            console.error(
              "ANSWER POLL FAILED:",
              viewerId,
              pollError,
            );
          }
        }, 700);

      answerTimersRef.current.set(
        viewerId,
        answerTimer,
      );
    } catch (err) {
      // FLATLIVE_GENERAL_LIVE_STALE_VIEWER_RACE_FIX_V1
      // Viewer can be created and then immediately closed by React dev
      // StrictMode / fast navigation. Treat that 404/410 race as normal.
      const staleViewerMessage =
        err instanceof Error ? err.message : String(err);
      const staleViewer =
        staleViewerMessage.includes("시청자 연결정보를 찾을 수 없거나 만료되었습니다") ||
        staleViewerMessage.includes("404") ||
        staleViewerMessage.includes("410");
      if (staleViewer) {
        console.info("STALE VIEWER SKIPPED:", viewerId);
        return;
      }
      console.warn(
        "VIEWER CONNECTION FAILED:",
        viewerId,
        err,
      );

      closeViewerPeer(
        viewerId,
      );
    } finally {
      creatingViewersRef.current.delete(
        viewerId,
      );
    }
  }

  function startViewerPolling(
    activeRoomId: string,
  ) {
    if (roomTimerRef.current) {
      clearInterval(
        roomTimerRef.current,
      );
    }

    const poll = async () => {
      try {
        const response =
          await fetch(
            `/api/live/signal?roomId=${encodeURIComponent(
              activeRoomId,
            )}`,
            {
              cache: "no-store",
            },
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        const viewerIds: string[] =
          Array.isArray(
            data.viewerIds,
          )
            ? data.viewerIds
            : [];

        const viewers: LiveViewerInfo[] =
          Array.isArray(
            data.viewers,
          )
            ? data.viewers
            : [];

        const rawVisibleViewers =
          viewers.length > 0
            ? viewers
            : viewerIds.map(
                (viewerId) => ({
                  viewerId,
                  userId: "",
                  username: "",
                  nickname: "",
                  avatarUrl: "",
                  isGuest: true,
                }),
              );

                const visibleViewerMap =
          new Map<
            string,
            LiveViewerInfo
          >();

        for (
          const viewer of rawVisibleViewers
        ) {
          const uniqueKey =
            (
              viewer.userId ||
              viewer.username ||
              viewer.viewerId
            )
              .trim()
              .toLowerCase();

          if (!uniqueKey) {
            continue;
          }

          if (
            !visibleViewerMap.has(
              uniqueKey,
            )
          ) {
            visibleViewerMap.set(
              uniqueKey,
              viewer,
            );
          }
        }

        const visibleViewers =
          Array.from(
            visibleViewerMap.values(),
          );

setViewerList(
          visibleViewers,
        );

        setViewerCount(
          visibleViewers.length,
        );

        const broadcasterUserId =
          typeof data.broadcasterUserId ===
          "string"
            ? data.broadcasterUserId
            : "";

        const now = Date.now();

        if (
          broadcasterUserId &&
          (
            followerUserIdRef.current !==
              broadcasterUserId ||
            now -
              followerLastFetchRef.current >
              1500
          )
        ) {
          followerUserIdRef.current =
            broadcasterUserId;

          followerLastFetchRef.current =
            now;

          void fetch(
            `/api/social/follow?targetUserId=${encodeURIComponent(
              broadcasterUserId,
            )}`,
            {
              cache: "no-store",
            },
          )
            .then(async (statsResponse) => {
              if (!statsResponse.ok) {
                return;
              }

              const stats =
                await statsResponse.json();

              if (
                typeof stats.followers ===
                "number"
              ) {
                setFollowerCount(
                  stats.followers,
                );
              }
            })
            .catch((statsError) => {
              console.error(
                "FOLLOWER COUNT FAILED:",
                statsError,
              );
            });
        }

        for (
          const viewerId
          of viewerIds
        ) {
          if (
            !peersRef.current.has(
              viewerId,
            )
          ) {
            void createPeerForViewer(
              activeRoomId,
              viewerId,
            );
          }
        }

        for (
          const viewerId
          of peersRef.current.keys()
        ) {
          if (
            !viewerIds.includes(
              viewerId,
            )
          ) {
            closeViewerPeer(
              viewerId,
            );
          }
        }

        setViewerCount(
          viewerIds.length,
        );

        if (Array.isArray(data.viewers)) {
          setViewerList(
            data.viewers.map((viewer: any) => ({
              viewerId:
                typeof viewer.viewerId === "string"
                  ? viewer.viewerId
                  : "",
              userId:
                typeof viewer.userId === "string"
                  ? viewer.userId
                  : "",
              username:
                typeof viewer.username === "string"
                  ? viewer.username
                  : "",
              nickname:
                typeof viewer.nickname === "string"
                  ? viewer.nickname
                  : "",
              avatarUrl:
                typeof viewer.avatarUrl === "string"
                  ? viewer.avatarUrl
                  : "",
              isGuest:
                Boolean(viewer.isGuest),
            })),
          );
        } else {
          setViewerList([]);
        }
      } catch (pollError) {
        console.error(
          "VIEWER POLL FAILED:",
          pollError,
        );
      }
    };

    void poll();

    roomTimerRef.current =
      setInterval(() => {
        void poll();
      }, 700);
  }

  function stopHeartbeat() {
    if (heartbeatTimerRef.current) {
      clearInterval(
        heartbeatTimerRef.current,
      );

      heartbeatTimerRef.current = null;
    }
  }

  function startHeartbeat(
    activeRoomId: string,
  ) {
    stopHeartbeat();

    const sendHeartbeat = async () => {
      try {
        const response = await fetch(
          "/api/live/signal",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action: "heartbeat",
              roomId: activeRoomId,
            }),
          },
        );

        if (!response.ok) {
          // FLATLIVE_STALE_HEARTBEAT_DIAGNOSTIC
          // 이미 종료/만료된 LIVE 방의 404는
          // 예상 가능한 stale 상태이므로 Next Issue로 띄우지 않는다.
          if (response.status === 404) {
            console.debug(
              "HEARTBEAT STALE ROOM:",
              response.status,
            );
          } else {
            console.warn(
              "HEARTBEAT FAILED:",
              response.status,
            );
          }

          if (response.status === 404) {
            await stopLive();

            setStatus(
              "방송이 종료되었습니다 · 다시 방송을 시작해주세요",
            );

            return;
          }
        }
      } catch (err) {
        console.debug(
          "HEARTBEAT ERROR:",
          err,
        );
      }
    };

    void sendHeartbeat();

    heartbeatTimerRef.current =
      setInterval(() => {
        void sendHeartbeat();
      }, 5000);
  }

  async function startLive() {
    const stream =
      streamRef.current;

    if (!liveTitle.trim()) {
      setError("방송 제목을 입력해주세요.");
      return;
    }

    if (!stream) {
      setError(
        "먼저 카메라와 마이크를 켜주세요.",
      );

      return;
    }

    const creatorConsentGranted =
      await ensureCreatorConsent();

    if (!creatorConsentGranted) {
      return;
    }

    try {
      setLiveStarting(true);
      setError("");
      setStatus(
        "방송방 생성 중...",
      );

      const response =
        await fetch(
          "/api/live/signal",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action: "create",
              title: liveTitle.trim(),
              category: liveCategory,
              isAdult,
              broadcasterName: "FLATIST",
            }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.roomId
      ) {
        throw new Error(
          data.error ||
            "방송방 생성에 실패했습니다.",
        );
      }

      const newRoomId =
        data.roomId as string;

      setRoomId(newRoomId);

      localStorage.setItem(
        ACTIVE_ROOM_STORAGE_KEY,
        newRoomId,
      );

      setStatus(
        "● LIVE · 시청자 기다리는 중...",
      );

      startViewerPolling(
        newRoomId,
      );

      startHeartbeat(
        newRoomId,
      );
    } catch (err) {
      console.error(err);

      setStatus(
        "방송 시작 실패",
      );

      setError(
        err instanceof Error
          ? err.message
          : "방송 시작 중 오류가 발생했습니다.",
      );
    } finally {
      setLiveStarting(false);
    }
  }

  function requestStopLive(
    exitAfter = false,
  ) {
    if (!roomId) {
      if (exitAfter) {
        window.location.href = "/live";
      }

      return;
    }

    setPendingExitHref("");
    setExitAfterStop(exitAfter);
    setStopLiveError("");
    setExitConfirmOpen(true);
  }

  async function stopLive() {
    const activeRoomId =
      roomId;

    if (activeRoomId) {
      try {
        const response =
          await fetch(
            "/api/live/signal",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                action: "close",
                roomId:
                  activeRoomId,
              }),
            },
          );

        if (!response.ok) {
          const data =
            await response
              .json()
              .catch(() => null);

          console.error(
            "ROOM CLOSE FAILED:",
            {
              roomId:
                activeRoomId,
              status:
                response.status,
              error:
                data?.error,
              errorCode:
                data?.errorCode,
              traceId:
                data?.traceId,
            },
          );

          return false;
        }
      } catch (err) {
        console.error(
          "ROOM CLOSE FAILED:",
          err,
        );

        return false;
      }
    }

    stopHeartbeat();

    if (roomTimerRef.current) {
      clearInterval(
        roomTimerRef.current,
      );

      roomTimerRef.current =
        null;
    }

    for (
      const viewerId
      of peersRef.current.keys()
    ) {
      closeViewerPeer(
        viewerId,
      );
    }

    localStorage.removeItem(
      ACTIVE_ROOM_STORAGE_KEY,
    );

    setRoomId("");
    setViewerCount(0);

    setStatus(
      cameraOn
        ? "방송 준비 완료"
        : "방송 준비",
    );

    return true;
  }

  async function confirmRequestedStop() {
    if (stoppingLive) {
      return;
    }

    setStoppingLive(true);
    setStopLiveError("");

    const shouldExit =
      exitAfterStop;

    const exitHref =
      pendingExitHref || "/live";

    const success =
      await stopLive();

    if (!success) {
      setStoppingLive(false);

      setStopLiveError(
        "방송 종료 처리에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );

      return;
    }

    streamRef.current
      ?.getTracks()
      .forEach((track) =>
        track.stop(),
      );

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject =
        null;
    }

    setCameraOn(false);
    setMicOn(false);
    setVideoInfo("");

    setExitConfirmOpen(false);
    setStoppingLive(false);

    if (shouldExit) {
      setPendingExitHref("");

      window.location.href =
        exitHref;
    }
  }

  async function stopCamera() {
    await stopLive();

    streamRef.current
      ?.getTracks()
      .forEach((track) =>
        track.stop(),
      );

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject =
        null;
    }

    setCameraOn(false);
    setMicOn(false);
    setVideoInfo("");
    setStatus("방송 준비");
  }

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const studioUrl =
      window.location.href;

    window.history.pushState(
      {
        flatliveStudioGuard: true,
      },
      "",
      studioUrl,
    );

    const handlePopState = () => {
      window.history.pushState(
        {
          flatliveStudioGuard: true,
        },
        "",
        studioUrl,
      );

      setPendingExitHref("");
      setExitAfterStop(true);
      setStopLiveError("");
      setExitConfirmOpen(true);
    };

    window.addEventListener(
      "popstate",
      handlePopState,
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState,
      );
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const handleStudioNavigation =
      (event: MouseEvent) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        const target =
          event.target;

        if (!(target instanceof Element)) {
          return;
        }

        const anchor =
          target.closest(
            "a[href]",
          ) as HTMLAnchorElement | null;

        if (!anchor) {
          return;
        }

        if (
          anchor.target === "_blank" ||
          anchor.hasAttribute(
            "download",
          )
        ) {
          return;
        }

        const url =
          new URL(
            anchor.href,
            window.location.href,
          );

        if (
          url.origin !==
          window.location.origin
        ) {
          return;
        }

        const destination =
          `${url.pathname}${url.search}${url.hash}`;

        const current =
          `${window.location.pathname}${window.location.search}${window.location.hash}`;

        if (
          destination === current
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        setPendingExitHref(
          destination,
        );

        setExitAfterStop(true);
        setStopLiveError("");
        setExitConfirmOpen(true);
      };

    document.addEventListener(
      "click",
      handleStudioNavigation,
      true,
    );

    return () => {
      document.removeEventListener(
        "click",
        handleStudioNavigation,
        true,
      );
    };
  }, [roomId]);

  async function restoreLiveAfterRefresh() {
    if (restoringRef.current) {
      return;
    }

    restoringRef.current = true;

    try {
      const savedRoomId =
        localStorage.getItem(
          ACTIVE_ROOM_STORAGE_KEY,
        );

      if (!savedRoomId) {
        return;
      }

      setStatus(
        "기존 방송 확인 중...",
      );

      const roomResponse =
        await fetch(
          `/api/live/signal?roomId=${encodeURIComponent(
            savedRoomId,
          )}`,
          {
            cache: "no-store",
          },
        );

      if (!roomResponse.ok) {
        localStorage.removeItem(
          ACTIVE_ROOM_STORAGE_KEY,
        );

        setStatus("방송 준비");
        return;
      }

      const heartbeatResponse =
        await fetch(
          "/api/live/signal",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action: "heartbeat",
              roomId: savedRoomId,
            }),
          },
        );

      if (!heartbeatResponse.ok) {
        localStorage.removeItem(
          ACTIVE_ROOM_STORAGE_KEY,
        );

        setStatus("방송 준비");
        return;
      }

      setRoomId(savedRoomId);

      startHeartbeat(
        savedRoomId,
      );

      setStatus(
        "● LIVE · 방송 복구 중...",
      );

      const cameraStarted =
        await startCamera();

      if (cameraStarted) {
        startViewerPolling(
          savedRoomId,
        );

        setStatus(
          "● LIVE · 새로고침 후 방송 복구됨",
        );
      } else {
        setStatus(
          "● LIVE · 방송방 유지 중 · 카메라를 다시 켜주세요",
        );
      }
    } catch (err) {
      console.error(
        "LIVE RESTORE FAILED:",
        err,
      );

      setError(
        "기존 방송을 복구하는 중 오류가 발생했습니다.",
      );
    } finally {
      restoringRef.current = false;
    }
  }

  useEffect(() => {
    void restoreLiveAfterRefresh();

    return () => {
      stopHeartbeat();

      if (roomTimerRef.current) {
        clearInterval(
          roomTimerRef.current,
        );
      }

      for (
        const timer
        of answerTimersRef.current.values()
      ) {
        clearInterval(timer);
      }

      answerTimersRef.current.clear();

      for (
        const peer
        of peersRef.current.values()
      ) {
        peer.close();
      }

      peersRef.current.clear();

      streamRef.current
        ?.getTracks()
        .forEach((track) =>
          track.stop(),
        );
    };
  }, []);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const sendPresence = (
      action:
        | "broadcaster-background"
        | "broadcaster-foreground",
    ) => {
      const body = JSON.stringify({
        action,
        roomId,
      });

      if (
        action === "broadcaster-background" &&
        navigator.sendBeacon
      ) {
        const blob = new Blob(
          [body],
          {
            type: "application/json",
          },
        );

        navigator.sendBeacon(
          "/api/live/signal",
          blob,
        );

        return;
      }

      void fetch(
        "/api/live/signal",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body,
          keepalive: true,
        },
      ).catch((error) => {
        console.warn(
          "BROADCASTER PRESENCE FAILED:",
          error,
        );
      });
    };

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "hidden"
        ) {
          console.log(
            "BROADCASTER BACKGROUND:",
            roomId,
          );

          sendPresence(
            "broadcaster-background",
          );

          return;
        }

        console.log(
          "BROADCASTER FOREGROUND:",
          roomId,
        );

        sendPresence(
          "broadcaster-foreground",
        );
      };

    const handlePageHide = () => {
      sendPresence(
        "broadcaster-background",
      );
    };

    const handlePageShow = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        sendPresence(
          "broadcaster-foreground",
        );
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "pagehide",
      handlePageHide,
    );

    window.addEventListener(
      "pageshow",
      handlePageShow,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener(
        "pagehide",
        handlePageHide,
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow,
      );
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) {
      setChatMessages([]);
      setChatError("");

      if (chatTimerRef.current) {
        clearInterval(chatTimerRef.current);
        chatTimerRef.current = null;
      }

      return;
    }

    let cancelled = false;

    const loadChat = async () => {
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
          if (
            response.status === 404 &&
            !cancelled
          ) {
            console.warn(
              "STALE LIVE ROOM CLEARED:",
              {
                roomId,
                errorCode:
                  data.errorCode,
                traceId:
                  data.traceId,
              },
            );

            cancelled = true;

            if (chatTimerRef.current) {
              clearInterval(
                chatTimerRef.current,
              );

              chatTimerRef.current =
                null;
            }

            stopHeartbeat();

            if (roomTimerRef.current) {
              clearInterval(
                roomTimerRef.current,
              );

              roomTimerRef.current =
                null;
            }

            for (
              const viewerId
              of peersRef.current.keys()
            ) {
              closeViewerPeer(
                viewerId,
              );
            }

            try {
              window.localStorage.removeItem(
                ACTIVE_ROOM_STORAGE_KEY,
              );
            } catch {
              // localStorage 접근 실패는 무시
            }

            setRoomId("");
            setChatMessages([]);
            setChatError("");
            setViewerCount(0);
            setViewerList([]);

            setStatus(
              cameraOn
                ? "방송 준비 완료"
                : "방송 준비",
            );
          }

          if (
            response.status !== 404
          ) {
            console.error(
              "STUDIO CHAT POLL FAILED:",
              {
                roomId,
                status:
                  response.status,
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
          Array.isArray(data.messages)
        ) {
          const nextMessages =
            data.messages as LiveChatMessage[];

          const latestGift =
            [...nextMessages]
              .reverse()
              .find(
                (message) =>
                  typeof message.message === "string" &&
                  message.message.startsWith("🎁 ") &&
                  message.message.includes(
                    "FLAT 후원했습니다.",
                  ) &&
                  (!message.donationMode ||
                    message.donationMode === "single"),
              );

          if (
            !giftPollingInitializedRef.current
          ) {
            giftPollingInitializedRef.current =
              true;

            if (latestGift) {
              lastGiftChatIdRef.current =
                latestGift.id;
            }
          } else if (
            latestGift &&
            latestGift.id !==
              lastGiftChatIdRef.current
          ) {
            void showDonationEffectFromMessage(
              latestGift.message,
              latestGift.id,
            );

            lastGiftChatIdRef.current =
              latestGift.id;
          }

          setChatMessages(
            nextMessages,
          );
        }
      } catch (chatPollError) {
        console.error(
          "STUDIO CHAT POLL ERROR:",
          chatPollError,
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

      if (chatTimerRef.current) {
        clearInterval(
          chatTimerRef.current,
        );

        chatTimerRef.current = null;
      }
    };
  }, [roomId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [chatMessages]);

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

        donationEffectTimerRef.current =
          null;
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
        "DONATION EFFECT DISPLAY ERROR:",
        error,
      );
    }
  }

  async function sendChat(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const message =
      chatInput.trim();

    if (
      !roomId ||
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
        const isChatMuted =
          data.errorCode ===
          "LIVE_CHAT_MUTED";

        const details =
          isChatMuted
            ? String(
                data.error ||
                  "채팅이 금지되었습니다.",
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

        if (
          data.errorCode !==
          "LIVE_CHAT_MUTED"
        ) {
          console.error(
            "STUDIO CHAT SEND FAILED:",
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
    } catch (chatSendError) {
      console.error(
        "STUDIO CHAT SEND ERROR:",
        chatSendError,
      );

      setChatError(
        "채팅 전송 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      setChatSending(false);
    }
  }

  const watchUrl =
    roomId &&
    typeof window !== "undefined"
      ? `${window.location.origin}/live/watch/${roomId}`
      : "";

  return (
    <main className="min-h-screen bg-black px-3 py-4 text-white  md:px-4 md:py-8 md:pb-8 pb-[calc(140px+env(safe-area-inset-bottom))] md:pb-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              requestStopLive(true);
            }}
            className="text-sm text-zinc-400"
          >
            ← 라이브로 돌아가기
          </button>

          {roomId && (
            <button
              type="button"
              onClick={() => {
                requestStopLive(true);
              }}
              aria-label="방송 종료 후 나가기"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-xl font-bold text-white"
            >
              ×
            </button>
          )}
        </div>

        <h1 className="mt-4 hidden text-xl font-black tracking-tight md:block">
          LIVE 스튜디오
        </h1>

        <div className="mt-4 overflow-visible rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-black/30 md:overflow-hidden">

          {/* FLATLIVE_MOBILE_STUDIO_HEADER_V2 */}
          <div className="border-b border-zinc-800 bg-black md:hidden">
            <div className="flex min-h-14 items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {roomId && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-600/15 px-2 py-1 text-[10px] font-black text-red-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      LIVE
                    </span>
                  )}

                  <input
                    type="text"
                    value={studioLiveTitleEdit}
                    onChange={(event) => {
                      setStudioLiveTitleEdit(
                        event.target.value,
                      );
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        roomId
                      ) {
                        event.preventDefault();
                        void saveStudioLiveTitle();
                      }
                    }}
                    disabled={!roomId}
                    maxLength={100}
                    placeholder={
                      roomId
                        ? "방송 제목"
                        : "방송 시작 전"
                    }
                    className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 text-sm font-black text-white outline-none placeholder:text-zinc-500 disabled:text-zinc-500"
                  />

                  {roomId && (
                    <button
                      type="button"
                      onClick={() => {
                        void saveStudioLiveTitle();
                      }}
                      disabled={studioLiveTitleSaving}
                      className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1.5 text-[10px] font-black text-white disabled:opacity-50"
                    >
                      {studioLiveTitleSaving
                        ? "저장중"
                        : "저장"}
                    </button>
                  )}
                </div>

                {roomId && (
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-400">
                    <span className="font-mono text-zinc-300">
                      {formattedLiveTime}
                    </span>

                    <span className="text-zinc-700">
                      ·
                    </span>

                    <span>
                      시청자{" "}
                      <strong className="text-white">
                        {viewerCount.toLocaleString(
                          "ko-KR",
                        )}
                      </strong>
                    </span>

                    <span className="text-zinc-700">
                      ·
                    </span>

                    <span>
                      팔로워{" "}
                      <strong className="text-white">
                        {followerCount.toLocaleString(
                          "ko-KR",
                        )}
                      </strong>
                    </span>
                  </div>
                )}

                {studioLiveTitleMessage && (
                  <div className="mt-1 text-[9px] text-zinc-400">
                    {studioLiveTitleMessage}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FLATLIVE_STUDIO_TITLE_EDITOR_V2 */}
          <div className="hidden min-h-12 items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-3 py-2 md:flex">
            <span className="shrink-0 text-[11px] font-black text-zinc-400">
              방송 제목
            </span>

            <input
              type="text"
              value={studioLiveTitleEdit}
              onChange={(event) => {
                setStudioLiveTitleEdit(
                  event.target.value,
                );
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  roomId
                ) {
                  event.preventDefault();
                  void saveStudioLiveTitle();
                }
              }}
              disabled={!roomId}
              maxLength={100}
              placeholder={
                roomId
                  ? "방송 제목을 입력하세요"
                  : "방송 시작 후 수정할 수 있습니다"
              }
              className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-black/40 px-3 py-1.5 text-sm font-semibold text-white outline-none focus:border-zinc-600 disabled:cursor-not-allowed disabled:text-zinc-600"
            />

            <button
              type="button"
              onClick={() => {
                void saveStudioLiveTitle();
              }}
              disabled={
                !roomId ||
                studioLiveTitleSaving
              }
              className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-black text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600"
            >
              {studioLiveTitleSaving
                ? "저장 중"
                : "저장"}
            </button>

            {studioLiveTitleMessage && (
              <span className="shrink-0 text-[10px] text-zinc-400">
                {studioLiveTitleMessage}
              </span>
            )}
          </div>
          {/* FLATLIVE_STUDIO_SIDE_PANEL */}
          <div className="block w-full overflow-visible bg-black md:flex md:items-stretch md:overflow-hidden">
            <div
              className={
                liveMatch &&
                liveMatch.participants.length >= 2
                  ? "relative z-[150] h-[46dvh] min-h-0 w-full bg-black md:relative md:inset-auto md:z-auto md:h-auto md:min-h-0 md:aspect-video md:flex-1"
                  : "fixed inset-0 z-[150] h-[100dvh] min-h-0 w-full bg-black md:relative md:inset-auto md:z-auto md:h-auto md:min-h-0 md:aspect-video md:flex-1"
              }
            >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            />

            {/* FLATLIVE_TREASURE_JAR_PORTAL_V1 */}
            {/* FLATLIVE_TREASURE_JAR_BROADCASTER_RENDER_V2_7 */}
            {roomId && (
              <TreasureJarOverlay
                roomId={roomId}
                mode="broadcaster"
              />
            )}

            {/* FLATLIVE_CLUTCH_MULTI_GRID_STUDIO_V1 */}
            <ClutchVideoGrid
              roomId={roomId}
              match={liveMatch}
              primaryStream={
                streamRef.current
              }
              streams={
                clutchRemoteStreams
              }
              videoRect={
                studioVideoContentRect
              }
              role="broadcaster"
            />

            {/* FLATLIVE_STUDIO_CHAT_OVERLAY_COMPONENT */}
            <div className="hidden md:block">
              <StudioChatOverlay
              roomId={roomId}
              enabled={chatOverlayEnabled}
              messages={chatMessages}
              position={chatOverlayPosition}
              size={chatOverlaySize}
              count={chatOverlayCount}
              opacity={chatOverlayOpacity}
              videoRect={studioVideoContentRect}
              x={chatOverlayX}
              y={chatOverlayY}
              onPositionChange={(x, y) => {
                setChatOverlayX(x);
                setChatOverlayY(y);
              }}
            />
            </div>

            {/* FLATLIVE_STUDIO_MOBILE_CAMERA_OVERLAY */}
            <StudioMobileOverlay
              roomId={roomId}
              liveTime={formattedLiveTime}
              viewerCount={viewerCount}
              viewerList={viewerList}
              videoRect={studioVideoContentRect}
              clutchActive={Boolean(
                liveMatch &&
                  (liveMatch.status === "READY" ||
                    liveMatch.status === "LIVE")
              )}

              chatMessages={chatMessages}

              cameraOn={cameraOn}
              micOn={micOn}
              liveStarting={liveStarting}

              liveTitle={liveTitle}
              setLiveTitle={setLiveTitle}

              liveCategory={liveCategory}
              setLiveCategory={setLiveCategory}

              isAdult={isAdult}
              setIsAdult={setIsAdult}

              studioLiveTitleEdit={studioLiveTitleEdit}
              setStudioLiveTitleEdit={setStudioLiveTitleEdit}

              studioLiveTitleSaving={studioLiveTitleSaving}
              studioLiveTitleMessage={studioLiveTitleMessage}

              chatInput={chatInput}
              setChatInput={setChatInput}

              chatSending={chatSending}
              chatError={chatError}
              error={error}

              chatPosition={chatOverlayPosition}
              setChatPosition={setChatOverlayPosition}

              chatSize={chatOverlaySize}
              setChatSize={setChatOverlaySize}

              chatCount={chatOverlayCount}
              setChatCount={setChatOverlayCount}

              chatX={chatOverlayX}
              setChatX={setChatOverlayX}

              chatY={chatOverlayY}
              setChatY={setChatOverlayY}

              onCamera={() => {
                void startCamera();
              }}

              onMicrophone={toggleMicrophone}

              onStartLive={() => {
                void startLive();
              }}

              onStopLive={() => {
                requestStopLive(false);
              }}

              onSaveTitle={() => {
                void saveStudioLiveTitle();
              }}

              onSubmitChat={sendChat}
            />

            <div className="absolute left-3 top-3 z-20 hidden max-w-[65%] truncate rounded-full bg-black/65 px-2.5 py-1.5 text-[10px] font-bold backdrop-blur md:block md:left-4 md:top-4 md:rounded-lg md:px-3 md:py-2 md:text-xs">
              {status}
            </div>

            {roomId && (
              <>
                <div className="absolute right-3 top-3 z-20 hidden items-center rounded-full border border-white/10 bg-black/80 px-3 py-2 shadow-lg backdrop-blur-md md:flex">
                  <span className="flex items-center gap-1.5 text-[11px] font-black text-red-400">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    LIVE
                  </span>
                </div>

                <div className="hidden absolute bottom-3 left-3 z-20 max-w-[75%] rounded-2xl border border-white/10 bg-black/75 p-2.5 shadow-lg backdrop-blur-md">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-[10px] font-black text-white">
                      현재 시청자
                    </span>

                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold text-zinc-300">
                      {viewerCount}명
                    </span>
                  </div>

                  {viewerList.length === 0 ? (
                    <div className="px-1 py-1 text-[10px] text-zinc-500">
                      아직 입장한 시청자가 없습니다.
                    </div>
                  ) : (
                    <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                      {viewerList.map(
                        (viewer, index) => {
                          const name =
                            viewer.nickname ||
                            viewer.username ||
                            `게스트 ${index + 1}`;

                          return (
                            <div
                              key={viewer.viewerId}
                              className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-2.5"
                            >
                              <div
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-zinc-700 bg-cover bg-center text-[10px] font-black text-white"
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
                                  name
                                    .slice(0, 1)
                                    .toUpperCase()}
                              </div>

                              <div className="max-w-[100px]">
                                <div className="truncate text-[10px] font-black text-white">
                                  {name}
                                </div>

                                <div className="truncate text-[9px] text-zinc-400">
                                  {viewer.username
                                    ? `@${viewer.username}`
                                    : "게스트"}
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

                        {/* FLATLIVE_STUDIO_PC_CHAT_PANEL_COMPONENT_V3 */}
            <StudioPcChatPanel
              roomId={roomId}
              viewerCount={viewerCount}
              viewerList={viewerList}

              viewerPanelOpen={viewerPanelOpen}
              setViewerPanelOpen={
                setViewerPanelOpen
              }

              watchUrl={watchUrl}

              StudioDonationChatStaticEffect={
                StudioDonationChatStaticEffect
              }

              chatOverlayEnabled={
                chatOverlayEnabled
              }
              setChatOverlayEnabled={
                setChatOverlayEnabled
              }

              chatOverlayPosition={
                chatOverlayPosition
              }
              setChatOverlayPosition={
                setChatOverlayPosition
              }

              chatOverlaySize={
                chatOverlaySize
              }
              setChatOverlaySize={
                setChatOverlaySize
              }

              chatOverlayCount={
                chatOverlayCount
              }
              setChatOverlayCount={
                setChatOverlayCount
              }

              chatOverlayOpacity={
                chatOverlayOpacity
              }
              setChatOverlayOpacity={
                setChatOverlayOpacity
              }

              activeDonationEffect={
                activeDonationEffect
              }
              setActiveDonationEffect={
                setActiveDonationEffect
              }
              setActiveDonationEffectChatId={
                setActiveDonationEffectChatId
              }

              chatMessages={chatMessages}
              chatBottomRef={chatBottomRef}

              chatInput={chatInput}
              setChatInput={setChatInput}

              chatSending={chatSending}

              chatError={chatError}
              setChatError={setChatError}

              sendChat={sendChat}
            />
          </div>

          {/* FLATLIVE_STUDIO_BOTTOM_INFO */}
          {roomId && (
            <div className="hidden h-10 items-center justify-center gap-x-2 border-t border-zinc-800 bg-black px-2 text-[10px] text-zinc-400 md:h-8 md:gap-x-3 md:bg-zinc-950 md:px-4 md:text-zinc-500 md:flex">
              <span>
                팔로워{" "}
                <strong className="font-semibold text-zinc-200">
                  {followerCount.toLocaleString(
                    "ko-KR",
                  )}
                  명
                </strong>
              </span>

              <span className="text-zinc-700">
                ·
              </span>

              <span>
                시청자{" "}
                <strong className="font-semibold text-zinc-200">
                  {viewerCount.toLocaleString(
                    "ko-KR",
                  )}
                  명
                </strong>
              </span>

              <span className="text-zinc-700">
                ·
              </span>

              <span>
                방송시간{" "}
                <strong className="font-mono font-semibold text-zinc-200">
                  {formattedLiveTime}
                </strong>
              </span>
            </div>
          )}

          {!roomId && (
            <div className="border-t border-zinc-800 px-4 pt-3">
              <div className="grid gap-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-zinc-400">
                    방송 제목
                  </label>

                  <input
                    type="text"
                    value={liveTitle}
                    onChange={(event) =>
                      setLiveTitle(event.target.value)
                    }
                    maxLength={60}
                    placeholder="방송 제목을 입력해주세요"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-zinc-400">
                    카테고리
                  </label>

                  <select
                    value={liveCategory}
                    onChange={(event) =>
                      setLiveCategory(event.target.value)
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="토크">토크</option>
                    <option value="음악">음악</option>
                    <option value="게임">게임</option>
                    <option value="먹방">먹방</option>
                    <option value="댄스">댄스</option>
                    <option value="버츄얼">버츄얼</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-zinc-400">
                    연령 설정
                  </label>

                  <div className="grid grid-cols-2 gap-2">
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
                    성인 대상 방송이라면 반드시 19세 이상으로 설정해주세요.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* FLATLIVE_MOBILE_CHAT_OVERLAY_CONTROLS */}
          {!(
            liveMatch &&
            (liveMatch.status === "READY" ||
              liveMatch.status === "LIVE")
          ) && (
            <>

          <section className="border-t border-zinc-800 bg-black px-3 py-3 md:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black text-white">
                  화면 댓글
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-500">
                  방송 영상 위 댓글 표시
                </div>
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
                    ? "rounded-full bg-yellow-400 px-3 py-1.5 text-[10px] font-black text-black"
                    : "rounded-full bg-zinc-800 px-3 py-1.5 text-[10px] font-black text-zinc-300"
                }
              >
                {chatOverlayEnabled
                  ? "ON"
                  : "OFF"}
              </button>
            </div>

            {chatOverlayEnabled && (
              <div className="mt-3 space-y-3">
                <div>
                  <div className="mb-1.5 text-[10px] font-bold text-zinc-500">
                    위치
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      ["top-left", "좌상"],
                      ["top-right", "우상"],
                      ["bottom-left", "좌하"],
                      ["bottom-right", "우하"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setChatOverlayPosition(
                            value as
                              | "top-left"
                              | "top-right"
                              | "bottom-left"
                              | "bottom-right",
                          );
                        }}
                        className={
                          chatOverlayPosition ===
                          value
                            ? "rounded-lg bg-white px-2 py-2 text-[10px] font-black text-black"
                            : "rounded-lg bg-zinc-900 px-2 py-2 text-[10px] font-bold text-zinc-400"
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="mb-1.5 text-[10px] font-bold text-zinc-500">
                      크기
                    </div>
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
                      className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-[11px] text-white"
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
                  </div>

                  <div>
                    <div className="mb-1.5 text-[10px] font-bold text-zinc-500">
                      댓글 수
                    </div>
                    <select
                      value={chatOverlayCount}
                      onChange={(event) => {
                        setChatOverlayCount(
                          Number(
                            event.target.value,
                          ) as 3 | 5 | 10,
                        );
                      }}
                      className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-[11px] text-white"
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
                  </div>

                  <div>
                    <div className="mb-1.5 text-[10px] font-bold text-zinc-500">
                      투명도
                    </div>
                    <select
                      value={chatOverlayOpacity}
                      onChange={(event) => {
                        setChatOverlayOpacity(
                          Number(
                            event.target.value,
                          ) as 50 | 70 | 90,
                        );
                      }}
                      className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-[11px] text-white"
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
                </div>
              </div>
            )}
          </section>


            </>
          )}

          {/* FLATLIVE_MOBILE_STUDIO_CHAT */}
          <section className="relative z-40 flex min-h-[230px] max-h-[40dvh] flex-col overflow-hidden border-t border-zinc-800 bg-zinc-950 md:hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5">
              <div>
                <div className="text-sm font-black text-white">
                  실시간 채팅
                </div>

                <div className="mt-0.5 text-[10px] text-zinc-500">
                  {roomId
                    ? `${chatMessages.length}개`
                    : "방송 시작 후 채팅이 표시됩니다"}
                </div>
              </div>

              {roomId && (
                <div className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-400">
                  LIVE
                </div>
              )}
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 pb-6"
              style={{
                WebkitOverflowScrolling:
                  "touch",
                scrollbarGutter:
                  "stable",
              }}
            >
              {!roomId ? (
                <div className="flex min-h-[150px] items-center justify-center text-center text-xs text-zinc-600">
                  방송을 시작하면
                  <br />
                  실시간 댓글이 여기에 표시됩니다.
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="flex min-h-[150px] items-center justify-center text-xs text-zinc-600">
                  아직 채팅이 없습니다.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {chatMessages
                    .slice(-20)
                    .map((chat) => {
                      const displayName =
                        chat.nickname ||
                        chat.username ||
                        "시청자";

                      const isDonation =
                        chat.message.startsWith(
                          "🎁 ",
                        );

                      return (
                        <div
                          key={chat.id}
                          className={
                            isDonation
                              ? "rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-3 py-2.5"
                              : "px-1 py-1"
                          }
                        >
                          <div className="flex items-start gap-2">
                            <strong className="max-w-[105px] shrink-0 truncate text-xs font-black text-yellow-400">
                              {displayName}
                            </strong>

                            <span className="min-w-0 break-words text-xs leading-5 text-zinc-200">
                              {chat.message}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {roomId && (
              <form
                onSubmit={sendChat}
                className="flex items-center gap-2 border-t border-zinc-800 bg-black p-3"
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
                  placeholder="채팅을 입력하세요..."
                  className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-[16px] text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400"
                />

                <button
                  type="submit"
                  disabled={
                    chatSending ||
                    !chatInput.trim()
                  }
                  className="h-11 shrink-0 rounded-xl bg-yellow-400 px-4 text-xs font-black text-black disabled:opacity-40"
                >
                  {chatSending
                    ? "전송중"
                    : "전송"}
                </button>
              </form>
            )}

            {chatError && (
              <div className="border-t border-red-900/50 bg-red-950/40 px-3 py-2 text-[11px] text-red-300">
                {chatError}
              </div>
            )}
          </section>

          {/* FLATLIVE_STUDIO_BROADCAST_CONTROLS_COMPONENT_V2 */}
          <StudioBroadcastControls
            cameraOn={cameraOn}
            micOn={micOn}
            roomId={roomId}
            liveStarting={liveStarting}
            videoInfo={videoInfo}

            startCamera={startCamera}
            stopCamera={stopCamera}
            toggleMicrophone={
              toggleMicrophone
            }
            startLive={startLive}

            requestStopLive={
              requestStopLive
            }
          />

          {/* FLATLIVE_CLUTCH_PANEL_MOBILE_ONLY_V1 */}
          <div className="md:hidden">
            {/* FLATLIVE_MATCH_PANEL_COMPONENT */}
            <MatchPanel
              roomId={roomId}
              onMatchChange={
                setLiveMatch
              }
            />
          </div>

          {roomId && (
            <div className="hidden">
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                <div className="font-black">
                  실시간 채팅
                </div>

                <div className="text-xs text-zinc-500">
                  {chatMessages.length}개
                </div>
              </div>

              <div className="h-64 overflow-y-auto px-4 py-3">
                {activeDonationEffect?.mediaType ===
                  "video" && (
                  <div className="sticky top-0 z-20 mb-3 flex justify-start bg-zinc-950/90 py-1 backdrop-blur-sm">
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
                      className="max-h-[140px] w-auto max-w-[220px] object-contain"
                      onLoadedData={(event) => {
                        void event.currentTarget
                          .play()
                          .catch((error) => {
                            console.error(
                              "STUDIO DONATION EFFECT PLAY ERROR:",
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
                          "STUDIO DONATION EFFECT VIDEO ERROR:",
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

                {chatMessages.length === 0 ? (
                  <div className="text-sm text-zinc-500">
                    아직 채팅이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chatMessages.map(
                      (chat) => (
                        <div
                          key={chat.id}
                          className={[
                            "text-sm",
                            chat.isBroadcaster
                              ? "w-fit rounded-md border border-yellow-300/35 bg-yellow-300/[0.08] px-2.5 py-1.5 shadow-sm"
                              : "",
                          ].join(" ")}
                        >
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

                          <strong
                            className={[
                              "mr-2 font-black",
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
                            {chat.nickname ||
                              chat.username}
                          </strong>

                          <span className="text-zinc-200">
                            {chat.message}
                          </span>

                          {(chat.donationMode === "repeat" ||
                            chat.donationMode === "sequence") && (
                            <StudioDonationChatStaticEffect
                              message={chat.message}
                            />
                          )}

                        </div>
                      ),
                    )}

                    <div
                      ref={chatBottomRef}
                    />
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
                  placeholder="채팅을 입력하세요..."
                  className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-[16px] text-white outline-none placeholder:text-zinc-500 focus:border-yellow-500"
                />

                <button
                  type="submit"
                  disabled={
                    chatSending ||
                    !chatInput.trim()
                  }
                  className="h-11 shrink-0 rounded-xl bg-yellow-400 px-5 text-sm font-black text-black disabled:opacity-40"
                >
                  {chatSending
                    ? "전송 중"
                    : "전송"}
                </button>
              </form>

              {chatError && (
                <div className="border-t border-red-900/50 bg-red-950/40 px-4 py-3 text-xs text-red-300">
                  {chatError}
                </div>
              )}
            </div>
          )}

          {roomId && (
            <div className="hidden">
              <div className="font-black text-green-400">
                테스트 방송 진행 중
              </div>

              <div className="mt-2 break-all text-xs text-zinc-400">
                방송 ID:{" "}
                {roomId}
              </div>

              <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-300">
                <span>
                  현재 연결 시청자:{" "}
                  <strong className="text-white">
                    {viewerCount}명
                  </strong>
                </span>

                <span>
                  팔로워:{" "}
                  <strong className="text-flat-yellow">
                    {followerCount}명
                  </strong>
                </span>
              </div>

              <div className="mt-4 rounded-xl bg-zinc-900 p-3">
                <div className="text-xs font-black text-white">
                  현재 시청자
                </div>

                {viewerList.length === 0 ? (
                  <div className="mt-3 text-xs text-zinc-500">
                    현재 접속 중인 시청자가 없습니다.
                  </div>
                ) : (
                  <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                    {viewerList.map(
                      (viewer, index) => {
                        const displayName =
                          viewer.nickname ||
                          viewer.username ||
                          `게스트 ${index + 1}`;

                        return (
                          <div
                            key={
                              viewer.viewerId
                            }
                            className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-black">
                                {displayName
                                  .slice(
                                    0,
                                    1,
                                  )
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <div className="truncate text-xs font-bold text-white">
                                  {
                                    displayName
                                  }
                                </div>

                                {viewer.username && (
                                  <div className="truncate text-[10px] text-zinc-500">
                                    @
                                    {
                                      viewer.username
                                    }
                                  </div>
                                )}
                              </div>
                            </div>

                            {viewer.isGuest && (
                              <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-1 text-[9px] text-zinc-400">
                                게스트
                              </span>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>

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

          {error && (
            <div className="px-5 pb-5 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>
    
      {/* FLATLIVE_STUDIO_STOP_LIVE_MODAL_COMPONENT */}
      <StudioStopLiveModal
        open={exitConfirmOpen}
        stoppingLive={stoppingLive}
        stopLiveError={stopLiveError}

        onCancel={() => {
          setExitConfirmOpen(false);
          setPendingExitHref("");
          setExitAfterStop(false);
          setStopLiveError("");
        }}

        onConfirm={confirmRequestedStop}
      />
</main>
  );
}

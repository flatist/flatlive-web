type Ref<T> = {
  current: T;
};

export type ViewerBanPayload = {
  errorCode?: string;
  error?: string;
  duration?: string;
  expiresAt?: string | null;
};

type Params = {
  data: ViewerBanPayload;
  blockModeration: () => void;
  offerTimerRef: Ref<
    ReturnType<typeof setInterval> | null
  >;
  peerRef: Ref<
    RTCPeerConnection | null
  >;
  videoRef: Ref<
    HTMLVideoElement | null
  >;
  viewerIdRef: Ref<string>;
  lastOfferSdpRef: Ref<string>;
  connectingRef: Ref<boolean>;
  setViewerId: (
    value: string,
  ) => void;
  setStatus: (
    value: string,
  ) => void;
  setError: (
    value: string,
  ) => void;
};

/**
 * FLATLIVE_VIEWER_BAN_REFACTOR_V4
 */
export function handleViewerBan({
  data,
  blockModeration,
  offerTimerRef,
  peerRef,
  videoRef,
  viewerIdRef,
  lastOfferSdpRef,
  connectingRef,
  setViewerId,
  setStatus,
  setError,
}: Params) {
  if (
    data.errorCode !==
      "LIVE_VIEWER_BANNED" &&
    data.errorCode !==
      "LIVE_VIEWER_KICKED"
  ) {
    return false;
  }

  blockModeration();

  setStatus(
    "강퇴되었습니다.",
  );

  setError(
    data.error ||
      "이 LIVE에 입장할 수 없습니다.",
  );

  // FLATLIVE_MOBILE_KICK_REDIRECT_SAFE_V1
  window.setTimeout(() => {
    window.location.replace("/live");
  }, 1200);

  try {
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

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
      }

      videoRef.current.srcObject =
        null;
    }

    viewerIdRef.current = "";
    setViewerId("");

    lastOfferSdpRef.current = "";
    connectingRef.current = false;
  } catch (cleanupError) {
    console.warn(
      "LIVE_VIEWER_KICK_CLEANUP_FAILED",
      cleanupError,
    );
  }

  return true;
}

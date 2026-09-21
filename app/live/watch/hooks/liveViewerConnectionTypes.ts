export type LiveViewerRef<T> = {
  current: T;
};

export type LiveViewerConnectionParams = {
  roomId: string;
  activeViewerId: string;
  offerSdp: string;
  peerRef: LiveViewerRef<RTCPeerConnection | null>;
  videoRef: LiveViewerRef<HTMLVideoElement | null>;
  viewerIdRef: LiveViewerRef<string>;
  lastOfferSdpRef: LiveViewerRef<string>;
  connectingRef: LiveViewerRef<boolean>;
  setViewerId: (viewerId: string) => void;
  setStatus: (status: string) => void;
  setError: (error: string) => void;
  isCancelled: () => boolean;
  isModerationBlocked: () => boolean;
  restartOfferPolling: (viewerId: string) => void;
};

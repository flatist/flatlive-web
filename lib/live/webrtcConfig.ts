// FLATLIVE_GENERAL_LIVE_WEBRTC_REBUILD_V1
// Shared ICE configuration for ordinary LIVE broadcaster/viewer WebRTC.
// Replace shared/public TURN with FLATLIVE-owned TURN before production.
export const FLATLIVE_LIVE_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:openrelay.metered.ca:80" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turns:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceTransportPolicy: "all",
  iceCandidatePoolSize: 4,
};

export async function waitForFlatliveIceComplete(
  peer: RTCPeerConnection,
  timeoutMs = 10000,
) {
  if (peer.iceGatheringState === "complete") {
    return;
  }

  await new Promise<void>((resolve) => {
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      peer.removeEventListener(
        "icegatheringstatechange",
        onState,
      );
      clearTimeout(timer);
      resolve();
    };

    const onState = () => {
      if (peer.iceGatheringState === "complete") {
        finish();
      }
    };

    const timer = window.setTimeout(
      finish,
      timeoutMs,
    );

    peer.addEventListener(
      "icegatheringstatechange",
      onState,
    );
  });
}

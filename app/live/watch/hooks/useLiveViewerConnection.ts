import type { LiveViewerConnectionParams } from "./liveViewerConnectionTypes";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

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
        peer.iceGatheringState ===
        "complete"
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

/**
 * FLATLIVE_WATCH_CONNECTION_REFACTOR_V1
 *
 * WATCH 페이지에서 순수 WebRTC 연결/answer 저장/404 재생성 부분만
 * 분리한다. viewer 생명주기, heartbeat, 강퇴, 성인인증은 기존 page.tsx에
 * 그대로 둬 회귀 범위를 최소화한다.
 */
export async function connectLiveViewer({
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
  isCancelled,
  isModerationBlocked,
  restartOfferPolling,
}: LiveViewerConnectionParams) {
  if (connectingRef.current) {
    return;
  }

  connectingRef.current = true;

  try {
    setError("");

    if (lastOfferSdpRef.current) {
      setStatus("방송 다시 연결 중...");
    } else {
      setStatus("방송자 연결 중...");
    }

    const oldPeer = peerRef.current;

    if (oldPeer) {
      oldPeer.ontrack = null;
      oldPeer.oniceconnectionstatechange =
        null;
      oldPeer.onconnectionstatechange =
        null;
      oldPeer.onicecandidateerror = null;
      oldPeer.close();
    }

    const peer = new RTCPeerConnection(
      ICE_SERVERS,
    );

    peerRef.current = peer;

    peer.ontrack = (event) => {
      console.log(
        "REMOTE TRACK:",
        event.track.kind,
      );

      if (event.track.kind === "video") {
        event.track.onmute = () => {
          console.log(
            "REMOTE VIDEO TRACK MUTED",
          );
          setStatus(
            "방송 다시 연결 기다리는 중...",
          );
          setError("");
        };

        event.track.onunmute = () => {
          console.log(
            "REMOTE VIDEO TRACK UNMUTED",
          );
          setStatus("● LIVE");
          setError("");
        };

        event.track.onended = () => {
          console.log(
            "REMOTE VIDEO TRACK ENDED",
          );
          setStatus(
            "방송 다시 연결 기다리는 중...",
          );
          setError("");
        };
      }

      // FLATLIVE_IPHONE_VIEWER_LIVE_VIDEO_FIX_V1
      // iOS Safari can deliver an ontrack event with event.streams empty,
      // and repeatedly replacing srcObject can interrupt play().
      const video = videoRef.current;

      if (!video) {
        return;
      }

      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");

      const signaledStream = event.streams[0];
      let stream: MediaStream;

      if (signaledStream) {
        stream = signaledStream;
      } else {
        const current =
          video.srcObject instanceof MediaStream
            ? video.srcObject
            : null;

        stream = current ?? new MediaStream();

        if (
          !stream
            .getTracks()
            .some(
              (track) =>
                track.id === event.track.id,
            )
        ) {
          stream.addTrack(event.track);
        }
      }

      const currentStream =
        video.srcObject instanceof MediaStream
          ? video.srcObject
          : null;

      if (
        !currentStream ||
        currentStream.id !== stream.id
      ) {
        video.srcObject = stream;
      }

      let playInFlight = false;

      const tryPlay = async () => {
        if (
          playInFlight ||
          video.paused === false
        ) {
          return;
        }

        playInFlight = true;

        try {
          await video.play();
        } catch (playError) {
          console.warn(
            "VIDEO PLAY FAILED:",
            playError,
          );

          // Safari often blocks autoplay when the remote stream has audio.
          // Fall back to muted playback so the LIVE picture is visible.
          try {
            video.muted = true;
            await video.play();

            console.info(
              "IPHONE VIEWER VIDEO MUTED AUTOPLAY FALLBACK",
            );
          } catch (fallbackError) {
            console.warn(
              "IPHONE VIEWER VIDEO FALLBACK FAILED:",
              fallbackError,
            );
          }
        } finally {
          playInFlight = false;
        }
      };

      const handleReady = () => {
        void tryPlay();
      };

      video.addEventListener(
        "loadedmetadata",
        handleReady,
        { once: true },
      );
      video.addEventListener(
        "canplay",
        handleReady,
        { once: true },
      );

      void tryPlay();
    };

    peer.oniceconnectionstatechange =
      () => {
        if (peerRef.current !== peer) {
          return;
        }

        console.log(
          "WATCH ICE:",
          peer.iceConnectionState,
        );
      };

    peer.onconnectionstatechange = () => {
      if (peerRef.current !== peer) {
        return;
      }

      console.log(
        "WATCH CONNECTION:",
        peer.connectionState,
      );

      if (
        peer.connectionState ===
        "connected"
      ) {
        setStatus("● LIVE");
        setError("");
      }

      if (
        peer.connectionState === "failed"
      ) {
        setStatus(
          "방송 다시 연결 기다리는 중...",
        );
        setError("");
      }

      if (
        peer.connectionState ===
        "disconnected"
      ) {
        setStatus(
          "방송 다시 연결 기다리는 중...",
        );
      }

      if (
        peer.connectionState === "closed"
      ) {
        setStatus(
          "방송 다시 연결 기다리는 중...",
        );
      }
    };

    peer.onicecandidateerror = (event) => {
      if (peerRef.current !== peer) {
        return;
      }

      // FLATLIVE_WATCH_ICE_DIAGNOSTIC
      console.debug(
        "WATCH ICE DIAGNOSTIC:",
        event,
      );
    };

    await peer.setRemoteDescription({
      type: "offer",
      sdp: offerSdp,
    });

    const answer = await peer.createAnswer();

    await peer.setLocalDescription(answer);

    await waitForIceComplete(peer);

    const local = peer.localDescription;

    if (!local?.sdp) {
      throw new Error(
        "시청자 연결정보를 만들지 못했습니다.",
      );
    }

    const answerResponse = await fetch(
      "/api/live/signal",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          action: "answer",
          roomId,
          viewerId: activeViewerId,
          description: {
            type: "answer",
            sdp: local.sdp,
          },
        }),
      },
    );

    const answerData =
      await answerResponse.json();

    if (!answerResponse.ok) {
      /*
       * FLATLIVE_VIEWER_ANSWER_404_RECOVER_V1
       * 기존 viewer가 close-viewer와 재연결 타이밍 충돌로 사라졌다면
       * 404에 한해 새 viewer를 생성한다. 403 강퇴는 복구하지 않는다.
       */
      if (answerResponse.status === 404) {
        console.info(
          "LIVE_VIEWER_RECREATE_AFTER_ANSWER_404",
          {
            roomId,
            previousViewerId:
              activeViewerId,
          },
        );

        try {
          if (peerRef.current === peer) {
            peer.ontrack = null;
            peer.onicecandidate = null;
            peer.oniceconnectionstatechange =
              null;
            peer.onconnectionstatechange =
              null;
            peer.onicecandidateerror = null;
            peer.close();
            peerRef.current = null;
          }
        } catch {
          // 재연결 정리 실패는 새 viewer 생성 자체를 막지 않는다.
        }

        const recreateResponse =
          await fetch(
            "/api/live/signal",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                action: "create-viewer",
                roomId,
              }),
            },
          );

        const recreateData =
          await recreateResponse.json();

        if (
          !recreateResponse.ok ||
          !recreateData.viewerId
        ) {
          throw new Error(
            recreateData.error ||
              "시청자 연결정보 재생성에 실패했습니다.",
          );
        }

        const nextViewerId = String(
          recreateData.viewerId,
        ).trim();

        viewerIdRef.current = nextViewerId;
        setViewerId(nextViewerId);
        lastOfferSdpRef.current = "";
        setStatus("방송 다시 연결 중...");
        setError("");

        /*
         * FLATLIVE_VIEWER_404_RESTART_POLLING_V2
         * finally에서 connectingRef가 false로 바뀐 다음 새 ID polling을 시작한다.
         */
        window.setTimeout(() => {
          if (
            isCancelled() ||
            isModerationBlocked()
          ) {
            return;
          }

          restartOfferPolling(
            nextViewerId,
          );
        }, 0);

        return;
      }

      throw new Error(
        answerData.error ||
          "시청 연결정보 저장에 실패했습니다.",
      );
    }

    lastOfferSdpRef.current = offerSdp;

    setStatus(
      "방송 연결 완료 대기 중...",
    );

    /*
     * FLATLIVE_IPHONE_VIEWER_CONNECT_TIMEOUT_RECOVERY_V1
     *
     * 일부 iPhone Safari에서 offer/answer 저장은 성공했지만
     * WebRTC가 new/connecting 상태에서 멈추는 경우가 있다.
     *
     * 연결 완료가 10초 안에 되지 않으면 기존 viewer를 정리하고
     * 새 viewerId로 한 번 더 정상 협상한다.
     */
    window.setTimeout(async () => {
      if (
        isCancelled() ||
        isModerationBlocked() ||
        peerRef.current !== peer ||
        peer.connectionState === "connected"
      ) {
        return;
      }

      console.warn(
        "WATCH CONNECTION TIMEOUT RECOVERY:",
        {
          roomId,
          viewerId: activeViewerId,
          connectionState:
            peer.connectionState,
          iceConnectionState:
            peer.iceConnectionState,
        },
      );

      try {
        peer.ontrack = null;
        peer.onicecandidate = null;
        peer.oniceconnectionstatechange =
          null;
        peer.onconnectionstatechange =
          null;
        peer.onicecandidateerror =
          null;

        peer.close();

        if (peerRef.current === peer) {
          peerRef.current = null;
        }
      } catch {
        // 기존 peer 정리 실패가 재연결을 막으면 안 됨
      }

      try {
        await fetch(
          "/api/live/signal",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action: "close-viewer",
              roomId,
              viewerId:
                activeViewerId,
            }),
            keepalive: true,
          },
        );
      } catch {
        // heartbeat 만료로도 정리되므로 계속 진행
      }

      if (
        isCancelled() ||
        isModerationBlocked()
      ) {
        return;
      }

      try {
        const recreateResponse =
          await fetch(
            "/api/live/signal",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                action:
                  "create-viewer",
                roomId,
              }),
            },
          );

        const recreateData =
          await recreateResponse.json();

        if (
          !recreateResponse.ok ||
          !recreateData.viewerId
        ) {
          throw new Error(
            recreateData.error ||
              "시청 연결정보 재생성에 실패했습니다.",
          );
        }

        const nextViewerId =
          String(
            recreateData.viewerId,
          ).trim();

        viewerIdRef.current =
          nextViewerId;

        setViewerId(
          nextViewerId,
        );

        lastOfferSdpRef.current =
          "";

        connectingRef.current =
          false;

        setStatus(
          "방송 다시 연결 중...",
        );

        setError("");

        window.setTimeout(() => {
          if (
            isCancelled() ||
            isModerationBlocked()
          ) {
            return;
          }

          restartOfferPolling(
            nextViewerId,
          );
        }, 0);
      } catch (recoveryError) {
        console.warn(
          "WATCH CONNECTION TIMEOUT RECOVERY FAILED:",
          recoveryError,
        );

        setStatus(
          "방송 다시 연결 기다리는 중...",
        );
      }
    }, 10000);
  } catch (err) {
    console.error(
      "CONNECT BROADCASTER FAILED:",
      err,
    );

    if (!isCancelled()) {
      setStatus(
        "방송 다시 연결 기다리는 중...",
      );
      setError("");
    }
  } finally {
    connectingRef.current = false;
  }
}


/**
 * FLATLIVE_VIEWER_LIFECYCLE_HELPERS_V2
 * viewer 생성 / heartbeat / 종료 API만 WATCH page에서 분리한다.
 */
export async function createLiveViewer(
  roomId: string,
) {
  const response = await fetch(
    "/api/live/signal",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "create-viewer",
        roomId,
      }),
    },
  );

  const data = await response.json();

  return {
    response,
    data,
  };
}

export async function sendLiveViewerHeartbeat(
  roomId: string,
  viewerId: string,
) {
  const response = await fetch(
    "/api/live/signal",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "viewer-heartbeat",
        roomId,
        viewerId,
      }),
    },
  );

  const data =
    response.status === 403
      ? await response.json()
      : null;

  return {
    response,
    data,
  };
}

export async function closeLiveViewer(
  roomId: string,
  viewerId: string,
) {
  await fetch(
    "/api/live/signal",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "close-viewer",
        roomId,
        viewerId,
      }),
      keepalive: true,
    },
  );
}

export function closeLiveViewerBeacon(
  roomId: string,
  viewerId: string,
) {
  const payload = JSON.stringify({
    action: "close-viewer",
    roomId,
    viewerId,
  });

  let beaconSent = false;

  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon ===
        "function"
    ) {
      beaconSent = navigator.sendBeacon(
        "/api/live/signal",
        new Blob(
          [payload],
          {
            type: "application/json",
          },
        ),
      );
    }
  } catch {
    beaconSent = false;
  }

  if (!beaconSent) {
    void fetch(
      "/api/live/signal",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: payload,
        keepalive: true,
      },
    ).catch(() => undefined);
  }
}

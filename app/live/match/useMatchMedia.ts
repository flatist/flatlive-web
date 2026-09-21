"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  LiveMatch,
} from "@/lib/live/match/match-types";

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls:
        "stun:stun.l.google.com:19302",
    },
  ],
};

type Props = {
  roomId: string;
  match: LiveMatch | null;
};

async function parseJson(
  response: Response,
) {
  const text =
    await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `클러치 서버 응답 오류 (${response.status})`,
    );
  }
}

function waitForIce(
  peer: RTCPeerConnection,
) {
  if (
    peer.iceGatheringState ===
    "complete"
  ) {
    return Promise.resolve();
  }

  return new Promise<void>(
    (resolve) => {
      const timeout =
        window.setTimeout(
          () => {
            peer.removeEventListener(
              "icegatheringstatechange",
              check,
            );

            resolve();
          },
          5000,
        );

      function check() {
        if (
          peer.iceGatheringState !==
          "complete"
        ) {
          return;
        }

        window.clearTimeout(
          timeout,
        );

        peer.removeEventListener(
          "icegatheringstatechange",
          check,
        );

        resolve();
      }

      peer.addEventListener(
        "icegatheringstatechange",
        check,
      );
    },
  );
}

export default function useMatchMedia({
  roomId,
  match,
}: Props) {
  const [
    remoteStream,
    setRemoteStream,
  ] = useState<MediaStream | null>(
    null,
  );

  const [
    status,
    setStatus,
  ] = useState(
    "상대 방송 대기",
  );

  const activeParticipants =
    useMemo(
      () =>
        match?.participants.filter(
          (participant) =>
            participant.status ===
              "HOST" ||
            participant.status ===
              "ACCEPTED",
        ) ?? [],
      [match],
    );

  const remoteRoomId =
    useMemo(
      () => {
        if (
          !match ||
          activeParticipants.length !==
            2 ||
          (
            match.status !==
              "READY" &&
            match.status !==
              "LIVE"
          )
        ) {
          return "";
        }

        return (
          activeParticipants.find(
            (participant) =>
              participant.roomId !==
              roomId,
          )?.roomId ?? ""
        );
      },
      [
        match,
        activeParticipants,
        roomId,
      ],
    );

  useEffect(() => {
    if (!remoteRoomId) {
      setRemoteStream(null);
      setStatus(
        "상대 방송 대기",
      );
      return;
    }

    let cancelled = false;
    let viewerId = "";

    let peer:
      | RTCPeerConnection
      | null = null;

    let pollTimer:
      | number
      | null = null;

    let heartbeatTimer:
      | number
      | null = null;

    let lastOffer = "";
    let processing = false;

    const closeViewer =
      () => {
        if (!viewerId) {
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
            body:
              JSON.stringify({
                action:
                  "close-viewer",
                roomId:
                  remoteRoomId,
                viewerId,
              }),
            keepalive: true,
          },
        ).catch(
          () => undefined,
        );
      };

    const heartbeat =
      async () => {
        if (
          cancelled ||
          !viewerId
        ) {
          return;
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
              body:
                JSON.stringify({
                  action:
                    "viewer-heartbeat",
                  roomId:
                    remoteRoomId,
                  viewerId,
                }),
            },
          );
        } catch {
        }
      };

    const processOffer =
      async (
        sdp: string,
      ) => {
        if (
          cancelled ||
          !peer ||
          processing ||
          !sdp ||
          lastOffer === sdp
        ) {
          return;
        }

        processing = true;

        try {
          setStatus(
            "상대 영상 연결 중...",
          );

          await peer.setRemoteDescription({
            type: "offer",
            sdp,
          });

          const answer =
            await peer.createAnswer();

          await peer.setLocalDescription(
            answer,
          );

          await waitForIce(
            peer,
          );

          const local =
            peer.localDescription;

          if (!local?.sdp) {
            throw new Error(
              "클러치 answer 생성 실패",
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
                body:
                  JSON.stringify({
                    action:
                      "answer",
                    roomId:
                      remoteRoomId,
                    viewerId,
                    description: {
                      type:
                        "answer",
                      sdp:
                        local.sdp,
                    },
                  }),
              },
            );

          const data =
            await parseJson(
              response,
            );

          if (!response.ok) {
            throw new Error(
              typeof data.error ===
                "string"
                ? data.error
                : "클러치 answer 저장 실패",
            );
          }

          lastOffer = sdp;
        } finally {
          processing = false;
        }
      };

    const pollOffer =
      async () => {
        if (
          cancelled ||
          !viewerId
        ) {
          return;
        }

        try {
          const response =
            await fetch(
              `/api/live/signal?roomId=${encodeURIComponent(
                remoteRoomId,
              )}&viewerId=${encodeURIComponent(
                viewerId,
              )}`,
              {
                cache:
                  "no-store",
              },
            );

          if (!response.ok) {
            return;
          }

          const data =
            await parseJson(
              response,
            );

          if (
            data.offer?.type ===
              "offer" &&
            typeof data.offer.sdp ===
              "string"
          ) {
            await processOffer(
              data.offer.sdp,
            );
          }
        } catch (error) {
          if (!cancelled) {
            console.debug(
              "MATCH MEDIA POLL:",
              error,
            );
          }
        }
      };

    const start =
      async () => {
        try {
          setStatus(
            "상대 방송 연결 준비...",
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
                body:
                  JSON.stringify({
                    action:
                      "create-viewer",
                    roomId:
                      remoteRoomId,
                  }),
              },
            );

          const data =
            await parseJson(
              response,
            );

          if (
            !response.ok ||
            typeof data.viewerId !==
              "string"
          ) {
            throw new Error(
              typeof data.error ===
                "string"
                ? data.error
                : "클러치 viewer 생성 실패",
            );
          }

          if (cancelled) {
            return;
          }

          viewerId =
            data.viewerId;

          peer =
            new RTCPeerConnection(
              ICE_CONFIG,
            );

          peer.ontrack =
            (event) => {
              if (cancelled) {
                return;
              }

              const next =
                event.streams[0] ??
                new MediaStream([
                  event.track,
                ]);

              setRemoteStream(
                next,
              );

              setStatus(
                "클러치 영상 연결됨",
              );
            };

          peer.onconnectionstatechange =
            () => {
              if (
                !peer ||
                cancelled
              ) {
                return;
              }

              if (
                peer.connectionState ===
                "connected"
              ) {
                setStatus(
                  "클러치 영상 연결됨",
                );
              }

              if (
                peer.connectionState ===
                  "failed" ||
                peer.connectionState ===
                  "disconnected"
              ) {
                setStatus(
                  "상대 영상 재연결 중...",
                );
              }
            };

          await pollOffer();

          pollTimer =
            window.setInterval(
              () => {
                void pollOffer();
              },
              700,
            );

          heartbeatTimer =
            window.setInterval(
              () => {
                void heartbeat();
              },
              15000,
            );
        } catch (error) {
          if (!cancelled) {
            console.error(
              "MATCH MEDIA CONNECT FAILED:",
              error,
            );

            setStatus(
              error instanceof Error
                ? error.message
                : "클러치 영상 연결 실패",
            );
          }
        }
      };

    void start();

    return () => {
      cancelled = true;

      if (pollTimer) {
        window.clearInterval(
          pollTimer,
        );
      }

      if (heartbeatTimer) {
        window.clearInterval(
          heartbeatTimer,
        );
      }

      closeViewer();

      if (peer) {
        peer.ontrack = null;
        peer.onconnectionstatechange =
          null;

        peer.close();
      }

      setRemoteStream(null);
    };
  }, [
    remoteRoomId,
    match?.matchId,
  ]);

  return {
    remoteStream,
    status,
  };
}

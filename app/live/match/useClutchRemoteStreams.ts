"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  LiveMatch,
} from "@/lib/live/match/match-types";

type StreamMap = Record<string, MediaStream>;

type Connection = {
  roomId: string;
  viewerId: string;
  peer: RTCPeerConnection;
  // FLATLIVE_IPHONE_CLUTCH_REMOTE_VIDEO_FIX_V1
  // 한 연결에서 하나의 MediaStream 객체를 끝까지 유지해 iOS Safari의
  // srcObject 재바인딩/재생 중단을 최소화한다.
  remoteStream: MediaStream;
  pollTimer: number | null;
  heartbeatTimer: number | null;
  disconnectTimer: number | null;
  lastOffer: string;
  processing: boolean;
};

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

async function safeJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return {} as Record<string, unknown>;
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function waitForIce(peer: RTCPeerConnection) {
  if (peer.iceGatheringState === "complete") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const timeout = window.setTimeout(() => {
      peer.removeEventListener(
        "icegatheringstatechange",
        check,
      );
      resolve();
    }, 5000);

    function check() {
      if (peer.iceGatheringState !== "complete") {
        return;
      }

      window.clearTimeout(timeout);
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
  });
}

type Props = {
  match: LiveMatch | null;
  excludeRoomIds?: string[];
};

export default function useClutchRemoteStreams({
  match,
  excludeRoomIds = [],
}: Props) {
  const [streams, setStreams] =
    useState<StreamMap>({});

  const excludeKey = [...excludeRoomIds]
    .sort()
    .join("|");

  const targetRoomIds = useMemo(() => {
    if (
      !match ||
      (match.status !== "READY" &&
        match.status !== "LIVE")
    ) {
      return [];
    }

    const excluded = new Set(excludeRoomIds);

    return match.participants
      .filter(
        (participant) =>
          (participant.status === "HOST" ||
            participant.status === "ACCEPTED") &&
          !excluded.has(participant.roomId),
      )
      .map((participant) => participant.roomId)
      .filter(Boolean)
      .slice(0, 4);
  }, [match, excludeKey]);

  const targetKey = targetRoomIds.join("|");

  useEffect(() => {
    let cancelled = false;

    const connections = new Map<
      string,
      Connection
    >();

    const connecting = new Set<string>();
    const retryTimers = new Map<
      string,
      number
    >();
    const retryCount = new Map<
      string,
      number
    >();

    const activeTargets = new Set(targetRoomIds);

    setStreams({});

    const trace = (
      event: string,
      roomId: string,
      detail?: Record<string, unknown>,
    ) => {
      console.log("[CLUTCH_STREAM_TRACE]", event, {
        roomId,
        ...(detail ?? {}),
      });
    };

    const clearRetry = (roomId: string) => {
      const timer = retryTimers.get(roomId);

      if (timer) {
        window.clearTimeout(timer);
      }

      retryTimers.delete(roomId);
    };

    const closeConnection = (
      connection: Connection,
      notifyServer = true,
    ) => {
      if (connection.pollTimer) {
        window.clearInterval(connection.pollTimer);
      }

      if (connection.heartbeatTimer) {
        window.clearInterval(
          connection.heartbeatTimer,
        );
      }

      if (connection.disconnectTimer) {
        window.clearTimeout(
          connection.disconnectTimer,
        );
      }

      connection.pollTimer = null;
      connection.heartbeatTimer = null;
      connection.disconnectTimer = null;

      try {
        connection.peer.ontrack = null;
        connection.peer.onconnectionstatechange = null;
        connection.peer.close();
      } catch {
        // 이미 닫힌 peer는 무시한다.
      }

      if (
        connections.get(connection.roomId) ===
        connection
      ) {
        connections.delete(connection.roomId);
      }

      setStreams((current) => {
        if (!(connection.roomId in current)) {
          return current;
        }

        const next = { ...current };
        delete next[connection.roomId];
        return next;
      });

      if (notifyServer && connection.viewerId) {
        void fetch("/api/live/signal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "close-viewer",
            roomId: connection.roomId,
            viewerId: connection.viewerId,
          }),
          keepalive: true,
        }).catch(() => undefined);
      }
    };

    let connectRoom:
      | ((roomId: string) => Promise<void>)
      | null = null;

    const scheduleReconnect = (
      roomId: string,
      reason: string,
      delayMs = 1200,
    ) => {
      if (
        cancelled ||
        !activeTargets.has(roomId) ||
        retryTimers.has(roomId)
      ) {
        return;
      }

      const previous = connections.get(roomId);
      if (previous) {
        closeConnection(previous, true);
      }

      const attempt =
        (retryCount.get(roomId) ?? 0) + 1;
      retryCount.set(roomId, attempt);

      const safeDelay = Math.min(
        Math.max(delayMs, 700) +
          Math.min(attempt, 6) * 250,
        3500,
      );

      trace("RECONNECT_SCHEDULED", roomId, {
        reason,
        attempt,
        delayMs: safeDelay,
      });

      const timer = window.setTimeout(() => {
        retryTimers.delete(roomId);

        if (!cancelled && connectRoom) {
          void connectRoom(roomId);
        }
      }, safeDelay);

      retryTimers.set(roomId, timer);
    };

    connectRoom = async (roomId: string) => {
      if (
        cancelled ||
        !activeTargets.has(roomId) ||
        connecting.has(roomId) ||
        connections.has(roomId)
      ) {
        return;
      }

      connecting.add(roomId);
      clearRetry(roomId);

      try {
        trace("CREATE_VIEWER_START", roomId);

        const createResponse = await fetch(
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

        const createData = await safeJson(
          createResponse,
        );

        const viewerId =
          typeof createData.viewerId === "string"
            ? createData.viewerId
            : "";

        if (
          cancelled ||
          !createResponse.ok ||
          !viewerId
        ) {
          const message =
            typeof createData.error === "string"
              ? createData.error
              : "create-viewer failed";

          trace("CREATE_VIEWER_FAILED", roomId, {
            status: createResponse.status,
            error: message,
          });

          if (!cancelled) {
            scheduleReconnect(
              roomId,
              `create-viewer:${createResponse.status}`,
              1000,
            );
          }

          return;
        }

        const peer = new RTCPeerConnection(
          ICE_CONFIG,
        );

        const connection: Connection = {
          roomId,
          viewerId,
          peer,
          remoteStream: new MediaStream(),
          pollTimer: null,
          heartbeatTimer: null,
          disconnectTimer: null,
          lastOffer: "",
          processing: false,
        };

        connections.set(roomId, connection);

        trace("VIEWER_CREATED", roomId, {
          viewerId,
        });

        peer.ontrack = (event) => {
          if (
            cancelled ||
            connections.get(roomId) !== connection
          ) {
            return;
          }

          // FLATLIVE_IPHONE_CLUTCH_REMOTE_VIDEO_FIX_V1
          // Safari에서는 ontrack(audio/video)마다 다른 MediaStream 참조가
          // 전달되는 경우 video.srcObject가 반복 교체되며 AbortError가 날 수 있다.
          // 연결마다 고정된 remoteStream에 track만 누적한다.
          const sourceTracks =
            event.streams[0]?.getTracks() ?? [event.track];

          let addedTrack = false;

          for (const track of sourceTracks) {
            if (
              !connection.remoteStream
                .getTracks()
                .some((currentTrack) => currentTrack.id === track.id)
            ) {
              connection.remoteStream.addTrack(track);
              addedTrack = true;
            }
          }

          retryCount.set(roomId, 0);

          setStreams((current) => {
            if (current[roomId] === connection.remoteStream) {
              return current;
            }

            return {
              ...current,
              [roomId]: connection.remoteStream,
            };
          });

          trace("REMOTE_TRACK_READY", roomId, {
            viewerId,
            trackKind: event.track.kind,
            streamTrackCount:
              connection.remoteStream.getTracks().length,
            addedTrack,
          });
        };

        peer.onconnectionstatechange = () => {
          if (
            cancelled ||
            connections.get(roomId) !== connection
          ) {
            return;
          }

          const state = peer.connectionState;

          trace("PEER_STATE", roomId, {
            viewerId,
            state,
          });

          if (state === "connected") {
            retryCount.set(roomId, 0);

            if (connection.disconnectTimer) {
              window.clearTimeout(
                connection.disconnectTimer,
              );
              connection.disconnectTimer = null;
            }
            return;
          }

          if (state === "failed") {
            scheduleReconnect(
              roomId,
              "peer-failed",
              500,
            );
            return;
          }

          if (state === "disconnected") {
            if (connection.disconnectTimer) {
              window.clearTimeout(
                connection.disconnectTimer,
              );
            }

            connection.disconnectTimer =
              window.setTimeout(() => {
                if (
                  !cancelled &&
                  connections.get(roomId) ===
                    connection &&
                  peer.connectionState ===
                    "disconnected"
                ) {
                  scheduleReconnect(
                    roomId,
                    "peer-disconnected",
                    500,
                  );
                }
              }, 1800);
          }
        };

        const processOffer = async (sdp: string) => {
          if (
            cancelled ||
            connection.processing ||
            !sdp ||
            connection.lastOffer === sdp ||
            connections.get(roomId) !== connection
          ) {
            return;
          }

          connection.processing = true;

          try {
            trace("OFFER_RECEIVED", roomId, {
              viewerId,
            });

            await peer.setRemoteDescription({
              type: "offer",
              sdp,
            });

            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            await waitForIce(peer);

            const local = peer.localDescription;

            if (!local?.sdp) {
              throw new Error(
                "CLUTCH_LOCAL_ANSWER_MISSING",
              );
            }

            const response = await fetch(
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
                  viewerId,
                  description: {
                    type: "answer",
                    sdp: local.sdp,
                  },
                }),
              },
            );

            if (!response.ok) {
              const data = await safeJson(response);
              const message =
                typeof data.error === "string"
                  ? data.error
                  : "answer failed";

              trace("ANSWER_FAILED", roomId, {
                viewerId,
                status: response.status,
                error: message,
              });

              if (
                response.status === 404 ||
                response.status === 410
              ) {
                scheduleReconnect(
                  roomId,
                  `answer:${response.status}`,
                  600,
                );
              }

              return;
            }

            connection.lastOffer = sdp;

            trace("ANSWER_SENT", roomId, {
              viewerId,
            });
          } catch (error) {
            trace("OFFER_PROCESS_FAILED", roomId, {
              viewerId,
              error:
                error instanceof Error
                  ? error.message
                  : String(error),
            });

            scheduleReconnect(
              roomId,
              "offer-process-failed",
              900,
            );
          } finally {
            connection.processing = false;
          }
        };

        const poll = async () => {
          if (
            cancelled ||
            connections.get(roomId) !== connection
          ) {
            return;
          }

          try {
            const response = await fetch(
              `/api/live/signal?roomId=${encodeURIComponent(
                roomId,
              )}&viewerId=${encodeURIComponent(
                viewerId,
              )}`,
              {
                cache: "no-store",
              },
            );

            if (!response.ok) {
              trace("OFFER_POLL_FAILED", roomId, {
                viewerId,
                status: response.status,
              });

              if (
                response.status === 404 ||
                response.status === 410
              ) {
                scheduleReconnect(
                  roomId,
                  `poll:${response.status}`,
                  700,
                );
              }

              return;
            }

            const data = await safeJson(response);
            const offer = data.offer as
              | { type?: unknown; sdp?: unknown }
              | undefined;

            if (
              offer?.type === "offer" &&
              typeof offer.sdp === "string"
            ) {
              await processOffer(offer.sdp);
            }
          } catch (error) {
            trace("OFFER_POLL_ERROR", roomId, {
              viewerId,
              error:
                error instanceof Error
                  ? error.message
                  : String(error),
            });
          }
        };

        await poll();

        if (
          cancelled ||
          connections.get(roomId) !== connection
        ) {
          closeConnection(connection, true);
          return;
        }

        connection.pollTimer = window.setInterval(
          () => {
            void poll();
          },
          700,
        );

        connection.heartbeatTimer =
          window.setInterval(() => {
            void (async () => {
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
                      action: "viewer-heartbeat",
                      roomId,
                      viewerId,
                    }),
                  },
                );

                if (
                  response.status === 404 ||
                  response.status === 410
                ) {
                  trace(
                    "HEARTBEAT_VIEWER_MISSING",
                    roomId,
                    {
                      viewerId,
                      status: response.status,
                    },
                  );

                  scheduleReconnect(
                    roomId,
                    `heartbeat:${response.status}`,
                    500,
                  );
                }
              } catch (error) {
                trace("HEARTBEAT_ERROR", roomId, {
                  viewerId,
                  error:
                    error instanceof Error
                      ? error.message
                      : String(error),
                });
              }
            })();
          }, 12000);
      } catch (error) {
        trace("CONNECT_EXCEPTION", roomId, {
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });

        if (!cancelled) {
          scheduleReconnect(
            roomId,
            "connect-exception",
            1000,
          );
        }
      } finally {
        connecting.delete(roomId);
      }
    };

    for (const roomId of targetRoomIds) {
      void connectRoom(roomId);
    }

    return () => {
      cancelled = true;

      for (const timer of retryTimers.values()) {
        window.clearTimeout(timer);
      }
      retryTimers.clear();

      for (const connection of connections.values()) {
        closeConnection(connection, true);
      }

      connections.clear();
      connecting.clear();
      setStreams({});
    };
  }, [targetKey]);

  return {
    streams,
    roomIds: targetRoomIds,
  };
}

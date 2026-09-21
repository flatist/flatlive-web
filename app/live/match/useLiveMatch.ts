"use client";

import {
  useCallback,
  useRef,
  useState,
} from "react";

import type {
  LiveMatch,
  LiveMatchApiResponse,
} from "@/lib/live/match/match-types";

type InviteListResponse = {
  ok: boolean;
  invites?: LiveMatch[];
  error?: string;
};

/* FLATLIVE_CLUTCH_ACTIVE_MATCH_NORMALIZER_V2 */
function normalizeActiveMatch(
  match: LiveMatch | null | undefined,
): LiveMatch | null {
  if (!match) {
    return null;
  }

  if (
    match.status === "CANCELLED" ||
    match.status === "FINISHED"
  ) {
    return null;
  }

  return match;
}


type RoomMatchResponse = {
  ok: boolean;
  activeMatch?: LiveMatch | null;
  invites?: LiveMatch[];
  error?: string;
};

export function useLiveMatch() {
  const [
    match,
    setMatch,
  ] = useState<LiveMatch | null>(
    null,
  );

  const [
    incomingInvites,
    setIncomingInvites,
  ] = useState<LiveMatch[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  // FLATLIVE_CLUTCH_LAST_API_ERROR_V1
  const lastApiErrorRef = useRef("");

  const getLastMatchError =
    useCallback(
      () => lastApiErrorRef.current,
      [],
    );

  const callMatchApi =
    useCallback(
      async (
        body: Record<
          string,
          unknown
        >,
      ) => {
        setLoading(true);
        setError("");
        lastApiErrorRef.current = "";

        try {
          const response =
            await fetch(
              "/api/live/match",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify(
                  body,
                ),
              },
            );

          const data =
            (await response.json()) as
              LiveMatchApiResponse;

          if (
            !response.ok ||
            !data.ok ||
            !data.match
          ) {
            throw new Error(
              data.error ??
                "MATCH_REQUEST_FAILED",
            );
          }

          setMatch(
              normalizeActiveMatch(
                data.match,
              ),
            );

          return data.match;
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "MATCH_REQUEST_FAILED";

          setError(message);
          lastApiErrorRef.current = message;

          // FLATLIVE_CLUTCH_INVITE_ERROR_PROPAGATE_V1
          // 초대 모달은 자체 catch가 있으므로
          // invite 오류만 실제 서버 메시지를 전달한다.
          if (body.action === "invite") {
            throw new Error(message);
          }

          // FLATLIVE_CLUTCH_SAFE_API_V1
          // 그 외 업무 오류는 기존처럼 UI 상태로 처리한다.
          return null;
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  const refreshMatch =
    useCallback(
      async (
        matchId: string,
      ) => {
        try {
          const response =
            await fetch(
              `/api/live/match?matchId=${encodeURIComponent(
                matchId,
              )}`,
              {
                cache: "no-store",
              },
            );

          const data =
            (await response.json()) as
              LiveMatchApiResponse;

          if (
            !response.ok ||
            !data.ok ||
            !data.match
          ) {
            throw new Error(
              data.error ??
                "MATCH_REQUEST_FAILED",
            );
          }

          setMatch(
              normalizeActiveMatch(
                data.match,
              ),
            );

          return data.match;
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "MATCH_REQUEST_FAILED";

          setError(message);

          return null;
        }
      },
      [],
    );

  const refreshRoomMatch =
      useCallback(
        async (
          roomId: string,
        ) => {
          // FLATLIVE_CLUTCH_REFRESH_ROOM_V1
          if (!roomId) {
            setMatch(null);
            return null;
          }

          try {
            const response =
              await fetch(
                `/api/live/match?roomId=${encodeURIComponent(
                  roomId,
                )}`,
                {
                  cache: "no-store",
                },
              );

            const data =
              (await response.json()) as
                RoomMatchResponse;

            if (
              !response.ok ||
              !data.ok
            ) {
              setError(
                data.error ??
                  "MATCH_ROOM_REFRESH_FAILED",
              );

              return null;
            }

            const activeMatch =
              data.activeMatch ??
              null;

            setMatch(activeMatch);

            if (
              Array.isArray(
                data.invites,
              )
            ) {
              setIncomingInvites(
                data.invites,
              );
            }

            return activeMatch;
          } catch (error) {
            console.debug(
              "CLUTCH ROOM REFRESH:",
              error,
            );

            return null;
          }
        },
        [],
      );

    const loadIncomingInvites =
    useCallback(
      async (
        roomId: string,
      ) => {
        if (!roomId) {
          setIncomingInvites([]);
          return [];
        }

        try {
          // FLATLIVE_CLUTCH_RX_CLIENT_TRACE_V1
          console.log(
            "[CLUTCH_RX_CLIENT_TRACE] 1 fetch start",
            {
              roomId,
            },
          );

          const response =
            await fetch(
              `/api/live/match?roomId=${encodeURIComponent(
                roomId,
              )}`,
              {
                cache: "no-store",
              },
            );

          console.log(
            "[CLUTCH_RX_CLIENT_TRACE] 2 fetch response",
            {
              roomId,
              ok: response.ok,
              status: response.status,
              url: response.url,
            },
          );

          const data =
            (await response.json()) as
              InviteListResponse;

          if (
            !response.ok ||
            !data.ok
          ) {
            throw new Error(
              data.error ??
                "MATCH_INVITE_LOAD_FAILED",
            );
          }

          const invites =
            Array.isArray(data.invites)
              ? data.invites
              : [];

          setIncomingInvites(
            invites,
          );

          console.log(
            "[CLUTCH_RX_CLIENT_TRACE] 3 invites loaded",
            {
              roomId,
              inviteCount: invites.length,
              inviteIds: invites.map(
                (item) => item.matchId,
              ),
            },
          );

          return invites;
        } catch (error) {
          console.log(
            "[CLUTCH_RX_CLIENT_TRACE] 4 fetch error",
            {
              roomId,
              error:
                error instanceof Error
                  ? error.message
                  : String(error),
            },
          );

          return [];
        }
      },
      [],
    );

  return {
    match,
    setMatch,

    incomingInvites,
    setIncomingInvites,

    loading,
    error,
    setError,

    callMatchApi,
    getLastMatchError,
    refreshMatch,
    refreshRoomMatch,
      loadIncomingInvites,
  };
}

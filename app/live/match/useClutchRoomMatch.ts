"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  LiveMatch,
} from "@/lib/live/match/match-types";

type MatchLookupResponse = {
  ok?: boolean;
  activeMatch?: LiveMatch | null;
};

export default function useClutchRoomMatch(
  roomId: string,
) {
  const [
    match,
    setMatch,
  ] = useState<LiveMatch | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  useEffect(() => {
    if (!roomId) {
      setMatch(null);
      return;
    }

    let cancelled = false;

    const load =
      async () => {
        try {
          setLoading(true);

          const response =
            await fetch(
              `/api/live/match?roomId=${encodeURIComponent(
                roomId,
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
            await response.json() as
              MatchLookupResponse;

          if (cancelled) {
            return;
          }

          setMatch(
            data.activeMatch ??
              null,
          );
        } catch (error) {
          if (!cancelled) {
            console.debug(
              "CLUTCH ROOM MATCH POLL:",
              error,
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

    void load();

    const timer =
      window.setInterval(
        () => {
          void load();
        },
        1000,
      );

    return () => {
      cancelled = true;

      window.clearInterval(
        timer,
      );
    };
  }, [
    roomId,
  ]);

  return {
    match,
    loading,
  };
}

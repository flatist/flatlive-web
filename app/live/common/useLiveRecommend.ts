"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type RecommendMessage = {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  nickname: string;
  message: string;
  createdAt: number;
};

type RecommendResponse = {
  success?: boolean;
  added?: boolean;
  count?: number;
  recommended?: boolean;
  message?: RecommendMessage | null;
  error?: string;
};

export function useLiveRecommend(
  roomId: string,
) {
  const [
    count,
    setCount,
  ] = useState(0);

  const [
    recommended,
    setRecommended,
  ] = useState(false);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const reload =
    useCallback(
      async () => {
        if (!roomId) {
          setCount(0);
          setRecommended(false);
          return;
        }

        try {
          const response =
            await fetch(
              `/api/live/recommend?roomId=${encodeURIComponent(
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
            (await response.json()) as RecommendResponse;

          if (
            typeof data.count ===
            "number"
          ) {
            setCount(
              data.count,
            );
          }

          if (
            typeof data.recommended ===
            "boolean"
          ) {
            setRecommended(
              data.recommended,
            );
          }
        } catch (error) {
          console.warn(
            "LIVE RECOMMEND POLL FAILED:",
            error,
          );
        }
      },
      [
        roomId,
      ],
    );

  useEffect(() => {
    void reload();

    if (!roomId) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          void reload();
        },
        2000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    roomId,
    reload,
  ]);

  const recommend =
    useCallback(
      async () => {
        if (
          !roomId ||
          busy ||
          recommended
        ) {
          return null;
        }

        try {
          setBusy(true);

          const response =
            await fetch(
              "/api/live/recommend",
              {
                method:
                  "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body:
                  JSON.stringify({
                    roomId,
                  }),
              },
            );

          const data =
            (await response.json()) as RecommendResponse;

          if (!response.ok) {
            throw new Error(
              data.error ||
                "추천 처리에 실패했습니다.",
            );
          }

          if (
            typeof data.count ===
            "number"
          ) {
            setCount(
              data.count,
            );
          }

          setRecommended(true);

          return data;
        } finally {
          setBusy(false);
        }
      },
      [
        roomId,
        busy,
        recommended,
      ],
    );

  return {
    count,
    recommended,
    busy,
    recommend,
    reload,
  };
}

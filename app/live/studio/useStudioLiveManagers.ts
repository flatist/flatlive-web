"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

export function useStudioLiveManagers(
  roomId: string,
) {
  const [
    managerUserIds,
    setManagerUserIds,
  ] =
    useState<Set<string>>(
      () => new Set(),
    );

  const reloadManagers =
    useCallback(async () => {
      if (!roomId) {
        setManagerUserIds(
          new Set(),
        );
        return;
      }

      try {
        const response =
          await fetch(
            `/api/live/managers?roomId=${encodeURIComponent(
              roomId,
            )}`,
            {
              cache: "no-store",
            },
          );

        const data =
          await response.json();

        if (
          response.ok &&
          Array.isArray(
            data.managers,
          )
        ) {
          setManagerUserIds(
            new Set(
              data.managers
                .map(
                  (
                    manager: {
                      managerUserId?: string;
                    },
                  ) =>
                    manager.managerUserId ||
                    "",
                )
                .filter(Boolean),
            ),
          );
        }
      } catch (error) {
        console.error(
          "LIVE_MANAGER_LIST_LOAD_FAILED",
          error,
        );
      }
    }, [roomId]);

  useEffect(() => {
    void reloadManagers();
  }, [reloadManagers]);

  const setManagerState =
    useCallback(
      (
        userId: string,
        enabled: boolean,
      ) => {
        setManagerUserIds(
          (current) => {
            const next =
              new Set(current);

            if (enabled) {
              next.add(userId);
            } else {
              next.delete(userId);
            }

            return next;
          },
        );
      },
      [],
    );

  return {
    managerUserIds,
    reloadManagers,
    setManagerState,
  };
}

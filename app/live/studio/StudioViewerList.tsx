"use client";

import {
  useEffect,
  useState,
} from "react";

import StudioKickModal from "./StudioKickModal";
import StudioViewerActionMenu from "./StudioViewerActionMenu";
import { useStudioLiveManagers } from "./useStudioLiveManagers";
import StudioChatMuteModal, {
  type StudioChatMuteInfo,
} from "./StudioChatMuteModal";

export type StudioViewerInfo = {
  viewerId: string;
  userId: string;
  username: string;
  nickname: string;
  avatarUrl: string;
  isGuest: boolean;
};

type Props = {
  roomId: string;
  viewers: StudioViewerInfo[];
};

export default function StudioViewerList({
  roomId,
  viewers,
}: Props) {
  const [
    selectedViewer,
    setSelectedViewer,
  ] =
    useState<StudioViewerInfo | null>(
      null,
    );

  // FLATLIVE_PC_CHAT_MUTE_V2
  const [
    selectedChatMuteViewer,
    setSelectedChatMuteViewer,
  ] =
    useState<StudioViewerInfo | null>(
      null,
    );

  const [
    chatMutes,
    setChatMutes,
  ] =
    useState<
      StudioChatMuteInfo[]
    >([]);

  // FLATLIVE_VIEWER_MANAGER_STATUS_V1
  const {
    managerUserIds,
    setManagerState,
  } =
    useStudioLiveManagers(
      roomId,
    );

  async function loadChatMutes() {
    if (!roomId) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/live/chat-moderation?roomId=${encodeURIComponent(
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
        Array.isArray(data.mutes)
      ) {
        setChatMutes(
          data.mutes,
        );
      }
    } catch (error) {
      console.error(
        "LIVE CHAT MUTE LIST FAILED",
        error,
      );
    }
  }

  useEffect(() => {
    void loadChatMutes();

    const timer =
      window.setInterval(() => {
        void loadChatMutes();
      }, 2000);

    return () => {
      window.clearInterval(timer);
    };
  }, [roomId]);

  return (
    <>
      {/* FLATLIVE_PC_VIEWER_LIST_ONLY_V2 */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-black text-white">
          현재 시청자
        </span>

        <span className="text-[10px] text-zinc-500">
          {viewers.length}명
        </span>
      </div>

      {viewers.length === 0 ? (
        <div className="rounded-xl bg-zinc-900 px-3 py-4 text-center text-xs text-zinc-500">
          현재 접속 중인 시청자가 없습니다.
        </div>
      ) : (
        <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
          {viewers.map(
            (viewer, index) => {
              const displayName =
                viewer.nickname ||
                viewer.username ||
                `게스트 ${index + 1}`;

              return (
                <div
                  key={viewer.viewerId}
                  className="flex items-center justify-between rounded-xl bg-zinc-900 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 bg-cover bg-center text-[11px] font-black text-white"
                      style={
                        viewer.avatarUrl
                          ? {
                              backgroundImage:
                                `url(${viewer.avatarUrl})`,
                            }
                          : undefined
                      }
                    >
                      {!viewer.avatarUrl &&
                        displayName
                          .slice(0, 1)
                          .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <div className="truncate text-xs font-bold text-white">
                          {displayName}
                        </div>

                        {viewer.userId &&
                          managerUserIds.has(
                            viewer.userId,
                          ) && (
                            <span
                              className="shrink-0 text-[10px] font-black text-yellow-400"
                              title="매니저"
                              aria-label="매니저"
                            >
                              ★
                            </span>
                          )}
                      </div>

                      {viewer.username && (
                        <div className="truncate text-[10px] text-zinc-500">
                          @{viewer.username}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {viewer.isGuest && (
                      <span className="rounded-full bg-zinc-800 px-2 py-1 text-[9px] text-zinc-400">
                        게스트
                      </span>
                    )}

                    {/* FLATLIVE_VIEWER_ACTION_MENU_PC_V1 */}
                    <StudioViewerActionMenu
                      roomId={roomId}
                      viewer={viewer}
                      isManager={
                        !!viewer.userId &&
                        managerUserIds.has(
                          viewer.userId,
                        )
                      }
                      isMuted={
                        !!viewer.userId &&
                        chatMutes.some(
                          (mute) =>
                            mute.targetUserId ===
                            viewer.userId,
                        )
                      }
                      onManagerChanged={(
                        enabled,
                      ) => {
                        if (
                          viewer.userId
                        ) {
                          setManagerState(
                            viewer.userId,
                            enabled,
                          );
                        }
                      }}
                      onChatMute={() => {
                        setSelectedChatMuteViewer(
                          viewer,
                        );
                      }}
                      onKick={() => {
                        setSelectedViewer(
                          viewer,
                        );
                      }}
                    />
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}

      <StudioChatMuteModal
        roomId={roomId}
        viewer={
          selectedChatMuteViewer
        }
        currentMute={
          selectedChatMuteViewer
            ? chatMutes.find(
                (mute) =>
                  mute.targetUserId ===
                  selectedChatMuteViewer.userId,
              ) ?? null
            : null
        }
        onClose={() =>
          setSelectedChatMuteViewer(
            null,
          )
        }
        onChanged={() => {
          void loadChatMutes();
        }}
      />

      <StudioKickModal
        roomId={roomId}
        viewer={selectedViewer}
        onClose={() =>
          setSelectedViewer(null)
        }
      />
    </>
  );
}

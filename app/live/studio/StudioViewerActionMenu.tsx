"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

type Viewer = {
  viewerId: string;
  userId: string;
  username: string;
  nickname: string;
  avatarUrl: string;
  isGuest: boolean;
};

type Props = {
  roomId: string;
  viewer: Viewer;
  isManager: boolean;
  isMuted: boolean;
  onManagerChanged: (
    enabled: boolean,
  ) => void;
  onChatMute: () => void;
  onKick: () => void;
};

export default function StudioViewerActionMenu({
  roomId,
  viewer,
  isManager,
  isMuted,
  onManagerChanged,
  onChatMute,
  onKick,
}: Props) {
  const buttonRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    loadingManager,
    setLoadingManager,
  ] = useState(false);

  const [
    mounted,
    setMounted,
  ] = useState(false);

  const [
    position,
    setPosition,
  ] = useState({
    top: 0,
    right: 12,
  });

  const displayName =
    viewer.nickname ||
    viewer.username ||
    "시청자";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const update = () => {
      const button =
        buttonRef.current;

      if (!button) {
        return;
      }

      const rect =
        button.getBoundingClientRect();

      setPosition({
        top:
          rect.bottom + 8,
        right:
          Math.max(
            12,
            window.innerWidth -
              rect.right,
          ),
      });
    };

    update();

    window.addEventListener(
      "resize",
      update,
    );

    window.addEventListener(
      "scroll",
      update,
      true,
    );

    const onKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === "Escape"
      ) {
        setOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      onKeyDown,
    );

    return () => {
      window.removeEventListener(
        "resize",
        update,
      );

      window.removeEventListener(
        "scroll",
        update,
        true,
      );

      window.removeEventListener(
        "keydown",
        onKeyDown,
      );
    };
  }, [open]);

  async function toggleManager() {
    if (
      loadingManager ||
      viewer.isGuest ||
      !viewer.userId
    ) {
      return;
    }

    try {
      setLoadingManager(true);

      const response =
        await fetch(
          "/api/live/managers",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              roomId,
              targetUserId:
                viewer.userId,
              action:
                isManager
                  ? "revoke"
                  : "assign",
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        window.alert(
          data?.error ||
            data?.errorCode ||
            "매니저 변경에 실패했습니다.",
        );
        return;
      }

      onManagerChanged(
        !isManager,
      );

      setOpen(false);
    } catch {
      window.alert(
        "매니저 변경 중 오류가 발생했습니다.",
      );
    } finally {
      setLoadingManager(false);
    }
  }

  const menuContent = (
    <>
      <div className="border-b border-white/10 px-4 py-3">
        <div className="truncate text-sm font-black text-white">
          {displayName}
        </div>

        <div className="mt-0.5 truncate text-[11px] text-zinc-500">
          {viewer.username
            ? `@${viewer.username}`
            : viewer.isGuest
              ? "게스트 시청자"
              : "로그인 시청자"}
        </div>
      </div>

      <div className="p-2">
        {!viewer.isGuest &&
          viewer.userId && (
            <button
              type="button"
              disabled={
                loadingManager
              }
              onClick={() => {
                void toggleManager();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5 active:bg-white/10 disabled:opacity-40"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-sm">
                ★
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-white">
                  {loadingManager
                    ? "처리 중..."
                    : isManager
                      ? "매니저 해제"
                      : "매니저 지정"}
                </span>

                <span className="mt-0.5 block text-[10px] text-zinc-500">
                  방송 운영 권한
                </span>
              </span>

              {isManager && (
                <span className="rounded-full bg-blue-500/15 px-2 py-1 text-[9px] font-black text-blue-300">
                  MANAGER
                </span>
              )}
            </button>
          )}

        {!viewer.isGuest &&
          viewer.userId && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onChatMute();
              }}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5 active:bg-white/10"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400/15 text-sm">
                💬
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-white">
                  {isMuted
                    ? "채팅금지 관리"
                    : "채팅금지"}
                </span>

                <span className="mt-0.5 block text-[10px] text-zinc-500">
                  30초 · 1분 · 해제 전까지
                </span>
              </span>

              {isMuted && (
                <span className="rounded-full bg-yellow-400/15 px-2 py-1 text-[9px] font-black text-yellow-300">
                  제한 중
                </span>
              )}
            </button>
          )}

        <div className="my-2 h-px bg-white/10" />

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onKick();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-red-500/10 active:bg-red-500/15"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/15 text-sm">
            ⛔
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-red-300">
              강퇴
            </span>

            <span className="mt-0.5 block text-[10px] text-zinc-500">
              현재 방송 또는 장기 차단
            </span>
          </span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen(
            (current) =>
              !current,
          );
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-lg font-black leading-none text-zinc-300 transition hover:bg-white/10 hover:text-white active:scale-95"
        aria-label={`${displayName} 관리 메뉴`}
      >
        ···
      </button>

      {mounted &&
        open &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="관리 메뉴 닫기"
              onClick={() => {
                setOpen(false);
              }}
              className="fixed inset-0 z-[2998] hidden bg-black/10 md:block"
            />

            <div
              className="fixed z-[2999] hidden w-[290px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-xl md:block"
              style={{
                top:
                  position.top,
                right:
                  position.right,
              }}
            >
              {menuContent}
            </div>

            <div className="fixed inset-0 z-[2998] flex items-end md:hidden">
              <button
                type="button"
                aria-label="관리 메뉴 닫기"
                onClick={() => {
                  setOpen(false);
                }}
                className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
              />

              <div className="relative z-10 w-full rounded-t-[28px] border-t border-white/10 bg-zinc-950 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-2xl">
                <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-zinc-700" />

                {menuContent}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

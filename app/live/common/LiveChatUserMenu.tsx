"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import ReportModal from "@/components/ReportModal";

type Mode = "viewer" | "studio";

type Props = {
  mode: Mode;
  roomId: string;
  viewerId?: string;
  userId?: string;
  username?: string;
  nickname?: string;
  isBroadcaster?: boolean;
  isManager?: boolean;
  triggerClassName?: string;
  children: React.ReactNode;
};

type ActorPermissions = {
  isBroadcaster: boolean;
  isManager: boolean;
  canModerate: boolean;
};

const EMPTY_PERMISSIONS: ActorPermissions = {
  isBroadcaster: false,
  isManager: false,
  canModerate: false,
};

export default function LiveChatUserMenu({
  mode,
  roomId,
  viewerId = "",
  userId = "",
  username = "",
  nickname = "",
  isBroadcaster = false,
  isManager = false,
  triggerClassName = "",
  children,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [managerEnabled, setManagerEnabled] = useState(isManager);
  const [targetMuted, setTargetMuted] = useState(false);
  const [actorPermissions, setActorPermissions] = useState<ActorPermissions>(
    mode === "studio"
      ? {
          isBroadcaster: true,
          isManager: false,
          canModerate: true,
        }
      : EMPTY_PERMISSIONS,
  );

  useEffect(() => setMounted(true), []);
  useEffect(() => setManagerEnabled(isManager), [isManager]);

  useEffect(() => {
    if (!open || !roomId) return;

    const controller = new AbortController();

    void (async () => {
      try {
        const managerResponse = await fetch(
          `/api/live/managers?roomId=${encodeURIComponent(roomId)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (managerResponse.ok) {
          const data = await managerResponse.json().catch(() => ({}));
          setActorPermissions({
            isBroadcaster: data?.isBroadcaster === true,
            isManager: data?.isManager === true,
            canModerate: data?.canModerate === true,
          });
        } else if (mode !== "studio") {
          setActorPermissions(EMPTY_PERMISSIONS);
        }

        if (userId) {
          const muteResponse = await fetch(
            `/api/live/chat-moderation?roomId=${encodeURIComponent(roomId)}`,
            {
              cache: "no-store",
              signal: controller.signal,
            },
          );

          if (muteResponse.ok) {
            const muteData = await muteResponse.json().catch(() => ({}));
            const mutes = Array.isArray(muteData?.mutes) ? muteData.mutes : [];
            setTargetMuted(
              mutes.some(
                (mute: { targetUserId?: string }) => mute?.targetUserId === userId,
              ),
            );
          } else {
            setTargetMuted(false);
          }
        } else {
          setTargetMuted(false);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("LIVE_CHAT_USER_MENU_PERMISSION_FAILED", error);

        if (mode !== "studio") {
          setActorPermissions(EMPTY_PERMISSIONS);
        }
        setTargetMuted(false);
      }
    })();

    return () => controller.abort();
  }, [mode, open, roomId, userId]);

  const displayName = nickname || username || "시청자";
  const canOpenProfile = Boolean(username);
  const actorCanModerate =
    actorPermissions.canModerate || mode === "studio";
  const actorIsBroadcaster =
    actorPermissions.isBroadcaster || mode === "studio";
  // FLATLIVE_CHAT_MODERATION_TARGET_FALLBACK_V4
  // 채팅 메시지의 viewerId가 비어 있어도 로그인 사용자의 userId가 있으면
  // 방송자/매니저 제재 메뉴를 숨기지 않는다.
  const canModerateTarget =
    actorCanModerate && !isBroadcaster && Boolean(viewerId || userId);

  const reportTitle = useMemo(
    () => `LIVE 채팅 사용자 신고: ${displayName}`,
    [displayName],
  );

  function close() {
    if (!busy) setOpen(false);
  }

  function openProfile() {
    if (!username) return;
    window.location.href = `/u/${encodeURIComponent(username)}`;
  }

  async function postJson(url: string, body: Record<string, unknown>) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || data?.errorCode || "처리에 실패했습니다.");
    }
    return data;
  }

  async function toggleManager() {
    if (!userId || busy || !actorIsBroadcaster) return;

    try {
      setBusy(true);
      await postJson("/api/live/managers", {
        roomId,
        targetUserId: userId,
        action: managerEnabled ? "revoke" : "assign",
      });
      setManagerEnabled((current) => !current);
      setOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "매니저 설정에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function muteChat(duration: "THIRTY_SECONDS" | "ONE_MINUTE" | "UNTIL_UNMUTED") {
    if ((!viewerId && !userId) || busy || !actorCanModerate) return;

    try {
      setBusy(true);
      await postJson("/api/live/chat-moderation", {
        action: "mute",
        roomId,
        viewerId,
        targetUserId: userId,
        duration,
      });
      setTargetMuted(true);
      window.alert(
        duration === "THIRTY_SECONDS"
          ? "30초 채팅금지를 적용했습니다."
          : duration === "ONE_MINUTE"
            ? "1분 채팅금지를 적용했습니다."
            : "해제 전까지 채팅금지를 적용했습니다.",
      );
      setOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "채팅금지 처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function unmuteChat() {
    if ((!viewerId && !userId) || busy || !actorCanModerate) return;

    try {
      setBusy(true);
      await postJson("/api/live/chat-moderation", {
        action: "unmute",
        roomId,
        viewerId,
        targetUserId: userId,
      });
      setTargetMuted(false);
      window.alert("채팅금지를 해제했습니다.");
      setOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "채팅금지 해제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function kick(duration: "ROOM" | "ONE_DAY" | "PERMANENT") {
    if ((!viewerId && !userId) || busy || !actorCanModerate) return;

    const label =
      duration === "ROOM"
        ? "현재 방송에서 강퇴"
        : duration === "ONE_DAY"
          ? "24시간 방송차단"
          : "영구 방송차단";

    if (!window.confirm(`${displayName}님에게 '${label}' 조치를 적용할까요?`)) return;

    try {
      setBusy(true);
      await postJson("/api/live/moderation", {
        action: "kick",
        roomId,
        viewerId,
        targetUserId: userId,
        duration,
        reason: "OTHER",
        reasonDetail: "채팅 닉네임 관리 메뉴에서 처리",
      });
      window.alert(`${label} 처리가 완료되었습니다.`);
      setOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "LIVE 제재 처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function openReport() {
    setOpen(false);
    setReportOpen(true);
  }

  const sheet = (
    <>
      <button
        type="button"
        aria-label="사용자 메뉴 닫기"
        onClick={close}
        className="fixed inset-0 z-[2147483600] bg-black/55 backdrop-blur-[1px]"
      />
      <div className="fixed bottom-0 left-0 right-0 z-[2147483601] mx-auto w-full max-w-md overflow-hidden rounded-t-[28px] border-t border-white/10 bg-zinc-950 pb-[calc(14px+env(safe-area-inset-bottom))] text-white shadow-2xl md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:w-[340px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-zinc-700 md:hidden" />
        <div className="border-b border-white/10 px-5 py-4">
          <div className="truncate text-base font-black">{displayName}</div>
          <div className="mt-1 truncate text-xs text-zinc-500">
            {username ? `@${username}` : userId ? "로그인 사용자" : "게스트/식별되지 않은 사용자"}
          </div>
        </div>

        <div className="max-h-[65dvh] overflow-y-auto p-2">
          <button
            type="button"
            disabled={!canOpenProfile}
            onClick={openProfile}
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-black hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35"
          >
            프로필 보기
          </button>

          {actorCanModerate ? (
            <>
              {actorIsBroadcaster && !isBroadcaster && userId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggleManager()}
                  className="mt-1 w-full rounded-xl px-4 py-3 text-left text-sm font-black text-blue-300 hover:bg-blue-500/10 disabled:opacity-40"
                >
                  {managerEnabled ? "매니저 해제" : "매니저 지정"}
                </button>
              )}

              {canModerateTarget && (
                <>
                  <div className="my-2 h-px bg-white/10" />
                  {targetMuted ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void unmuteChat()}
                      className="w-full rounded-xl px-4 py-3 text-left text-sm font-black text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40"
                    >
                      채팅금지 해제
                    </button>
                  ) : (
                    <>
                      <div className="px-4 pb-1 pt-2 text-[10px] font-black text-zinc-500">
                        채팅금지
                      </div>
                      <div className="grid grid-cols-3 gap-1 px-2 pb-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void muteChat("THIRTY_SECONDS")}
                          className="rounded-lg bg-yellow-400/10 px-2 py-2 text-[11px] font-black text-yellow-300 disabled:opacity-40"
                        >
                          30초
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void muteChat("ONE_MINUTE")}
                          className="rounded-lg bg-yellow-400/10 px-2 py-2 text-[11px] font-black text-yellow-300 disabled:opacity-40"
                        >
                          1분
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void muteChat("UNTIL_UNMUTED")}
                          className="rounded-lg bg-yellow-400/10 px-2 py-2 text-[11px] font-black text-yellow-300 disabled:opacity-40"
                        >
                          해제 전
                        </button>
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={openReport}
                    className="mt-1 w-full rounded-xl px-4 py-3 text-left text-sm font-black text-orange-300 hover:bg-orange-500/10"
                  >
                    신고하기
                  </button>

                  <div className="my-2 h-px bg-white/10" />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void kick("ROOM")}
                    className="w-full rounded-xl px-4 py-3 text-left text-sm font-black text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                  >
                    현재 방송에서 강퇴
                  </button>

                  {userId && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void kick("ONE_DAY")}
                        className="mt-1 w-full rounded-xl px-4 py-3 text-left text-sm font-black text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                      >
                        24시간 방송차단
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void kick("PERMANENT")}
                        className="mt-1 w-full rounded-xl px-4 py-3 text-left text-sm font-black text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                      >
                        영구 방송차단
                      </button>
                    </>
                  )}
                </>
              )}

              {!canModerateTarget && !isBroadcaster && (
                <button
                  type="button"
                  onClick={openReport}
                  className="mt-1 w-full rounded-xl px-4 py-3 text-left text-sm font-black text-orange-300 hover:bg-orange-500/10"
                >
                  신고하기
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={openReport}
              className="mt-1 w-full rounded-xl px-4 py-3 text-left text-sm font-black text-red-300 hover:bg-red-500/10"
            >
              신고하기
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className={triggerClassName}
        aria-label={`${displayName} 사용자 메뉴`}
      >
        {children}
      </button>

      {mounted && open && createPortal(sheet, document.body)}

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="LIVE"
        targetId={roomId}
        targetOwnerUserId={userId}
        targetTitle={reportTitle}
      />
    </>
  );
}

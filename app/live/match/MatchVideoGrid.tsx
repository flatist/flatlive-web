"use client";

import {
  useEffect,
  useMemo,
  useRef,
} from "react";

import type {
  LiveMatch,
} from "@/lib/live/match/match-types";

import type {
  StudioVideoContentRect,
} from "@/app/live/studio/useStudioVideoContentRect";

type Props = {
  roomId: string;
  match: LiveMatch | null;
  localStream:
    MediaStream | null;
  remoteStream:
    MediaStream | null;
  status: string;
  videoRect:
    StudioVideoContentRect | null;
};

export default function MatchVideoGrid({
  roomId,
  match,
  localStream,
  remoteStream,
  status,
  videoRect,
}: Props) {
  const localRef =
    useRef<HTMLVideoElement>(
      null,
    );

  const remoteRef =
    useRef<HTMLVideoElement>(
      null,
    );

  const participants =
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

  const active =
    Boolean(
      match &&
      participants.length === 2 &&
      (
        match.status === "READY" ||
        match.status === "LIVE"
      ),
    );

  const localParticipant =
    participants.find(
      (participant) =>
        participant.roomId ===
        roomId,
    );

  const remoteParticipant =
    participants.find(
      (participant) =>
        participant.roomId !==
        roomId,
    );

  useEffect(() => {
    const video =
      localRef.current;

    if (!video) {
      return;
    }

    video.srcObject =
      active
        ? localStream
        : null;

    if (active) {
      void video.play().catch(
        () => undefined,
      );
    }
  }, [
    active,
    localStream,
  ]);

  useEffect(() => {
    const video =
      remoteRef.current;

    if (!video) {
      return;
    }

    video.srcObject =
      active
        ? remoteStream
        : null;

    if (active) {
      void video.play().catch(
        () => undefined,
      );
    }
  }, [
    active,
    remoteStream,
  ]);

  if (
    !active ||
    !videoRect
  ) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute z-10 grid grid-cols-2 overflow-hidden bg-black"
      style={{
        left:
          videoRect.left,
        top:
          videoRect.top,
        width:
          videoRect.width,
        height:
          videoRect.height,
      }}
    >
      <div className="relative overflow-hidden border-r border-white/20 bg-black">
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />

        <div className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-black text-white">
          {localParticipant
            ?.nickname ||
            "나"}
        </div>
      </div>

      <div className="relative overflow-hidden bg-black">
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />

        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center px-3 text-center">
            <div>
              <div className="text-xs font-black text-white">
                상대 방송 연결 중
              </div>

              <div className="mt-1 text-[9px] text-zinc-400">
                {status}
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-black text-white">
          {remoteParticipant
            ?.nickname ||
            "상대 방송자"}
        </div>
      </div>

      <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-red-600 px-3 py-1 text-[9px] font-black text-white">
        MATCH
      </div>
    </div>
  );
}

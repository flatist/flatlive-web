export type LiveKickNotice = {
  roomId: string;
  viewerId: string;
  duration:
    | "ROOM"
    | "ONE_DAY"
    | "PERMANENT";
  message: string;
  createdAt: number;
  expiresAt: number;
};

type KickNoticeMap =
  Map<string, LiveKickNotice>;

declare global {
  var __flatliveLiveKickNotices:
    | KickNoticeMap
    | undefined;
}

const notices =
  globalThis.__flatliveLiveKickNotices ??
  new Map<string, LiveKickNotice>();

globalThis.__flatliveLiveKickNotices =
  notices;

function key(
  roomId: string,
  viewerId: string,
) {
  return `${roomId}:${viewerId}`;
}

export function markViewerKicked(input: {
  roomId: string;
  viewerId: string;
  duration:
    | "ROOM"
    | "ONE_DAY"
    | "PERMANENT";
  message: string;
}) {
  const now = Date.now();

  const notice: LiveKickNotice = {
    ...input,
    createdAt: now,
    expiresAt:
      now + 2 * 60 * 1000,
  };

  notices.set(
    key(input.roomId, input.viewerId),
    notice,
  );

  return notice;
}

export function getViewerKickNotice(
  roomId: string,
  viewerId: string,
) {
  const notice =
    notices.get(
      key(roomId, viewerId),
    );

  if (!notice) {
    return null;
  }

  if (
    notice.expiresAt <= Date.now()
  ) {
    notices.delete(
      key(roomId, viewerId),
    );

    return null;
  }

  return notice;
}

export type LiveBanDuration =
  | "ROOM"
  | "ONE_DAY"
  | "PERMANENT";

export type LiveBanScope =
  | "ROOM"
  | "BROADCASTER";

export type LiveBanReason =
  | "SPAM"
  | "ABUSE"
  | "SEXUAL_HARASSMENT"
  | "DISRUPTION"
  | "OTHER";

export type LiveViewerBanRecord = {
  banId: string;
  broadcasterUserId: string;
  roomId: string | null;
  targetUserId: string | null;
  targetGuestId: string | null;
  scope: LiveBanScope;
  durationType: LiveBanDuration;
  reason: LiveBanReason;
  reasonDetail: string;
  actorUserId: string;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  revokedByUserId: string | null;
};

export const LIVE_GUEST_COOKIE_NAME =
  "flatlive-live-guest-id";

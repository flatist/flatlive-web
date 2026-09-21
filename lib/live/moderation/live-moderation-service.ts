import crypto from "crypto";

import { PostgresLiveModerationRepository } from "./postgres-live-moderation-repository";

import type {
  LiveBanDuration,
  LiveBanReason,
} from "./live-moderation-types";

export class LiveModerationService {
  private repository =
    new PostgresLiveModerationRepository();

  async checkJoinAllowed(input: {
    broadcasterUserId: string;
    roomId: string;
    targetUserId?: string;
    targetGuestId?: string;
  }) {
    const ban =
      await this.repository.findActiveBan(
        input,
      );

    return {
      allowed: !ban,
      ban,
    };
  }

  async kick(input: {
    broadcasterUserId: string;
    roomId: string;
    targetUserId?: string;
    targetGuestId?: string;
    duration: LiveBanDuration;
    reason: LiveBanReason;
    reasonDetail?: string;
    actorUserId: string;
  }) {
    const targetUserId =
      input.targetUserId?.trim() || "";

    const targetGuestId =
      input.targetGuestId?.trim() || "";

    if (
      !targetUserId &&
      !targetGuestId
    ) {
      throw new Error(
        "LIVE_KICK_TARGET_REQUIRED",
      );
    }

    if (
      !targetUserId &&
      input.duration !== "ROOM"
    ) {
      throw new Error(
        "LIVE_GUEST_LONG_BAN_NOT_ALLOWED",
      );
    }

    const scope =
      input.duration === "ROOM"
        ? "ROOM"
        : "BROADCASTER";

    const expiresAt =
      input.duration === "ONE_DAY"
        ? new Date(
            Date.now() +
              24 * 60 * 60 * 1000,
          )
        : null;

    return this.repository.createBan({
      banId: crypto.randomUUID(),
      broadcasterUserId:
        input.broadcasterUserId,
      roomId: input.roomId,
      targetUserId:
        targetUserId || null,
      targetGuestId:
        targetGuestId || null,
      scope,
      durationType:
        input.duration,
      reason: input.reason,
      reasonDetail:
        input.reasonDetail
          ?.trim()
          .slice(0, 500) || "",
      actorUserId:
        input.actorUserId,
      expiresAt,
    });
  }

  async listActive(
    broadcasterUserId: string,
  ) {
    return this.repository
      .listActiveByBroadcaster(
        broadcasterUserId,
      );
  }

  async revoke(input: {
    banId: string;
    broadcasterUserId: string;
    actorUserId: string;
  }) {
    return this.repository.revokeBan({
      banId: input.banId,
      broadcasterUserId:
        input.broadcasterUserId,
      actorUserId:
        input.actorUserId,
    });
  }
}

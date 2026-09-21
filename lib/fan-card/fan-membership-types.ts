import type { FanMembershipDurationType } from "./fan-card-types";

export type FanMembershipTier = "FAN" | "VIP";

export type FanMembershipStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export type FanMembershipRecord = {
  id: string;
  broadcasterUserId: string;
  viewerUserId: string;
  tier: FanMembershipTier;
  status: FanMembershipStatus;
  startedAt: number;
  expiresAt: number | null;
  priceFlat: number;
  durationType: FanMembershipDurationType;
  createdAt: number;
  updatedAt: number;
};

export type FanMembershipPurchaseInput = {
  broadcasterUserId: string;
  viewerUserId: string;
  tier: FanMembershipTier;
  priceFlat: number;
  durationType: FanMembershipDurationType;
};

export type FanMembershipRevokeInput = {
  broadcasterUserId: string;
  viewerUserId: string;
};

export function isFanMembershipActive(
  membership: FanMembershipRecord,
  now = Date.now(),
) {
  if (membership.status !== "ACTIVE") {
    return false;
  }

  if (membership.expiresAt !== null && membership.expiresAt <= now) {
    return false;
  }

  return true;
}

export function getRuntimeFanMembershipStatus(
  membership: FanMembershipRecord,
  now = Date.now(),
): FanMembershipStatus {
  if (membership.status === "REVOKED") {
    return "REVOKED";
  }

  if (membership.expiresAt !== null && membership.expiresAt <= now) {
    return "EXPIRED";
  }

  return membership.status;
}

export function isVipTier(tier: FanMembershipTier) {
  return tier === "VIP";
}

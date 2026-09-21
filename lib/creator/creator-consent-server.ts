import {
  CREATOR_POLICY_VERSION,
  MUSIC_IP_POLICY_VERSION,
} from "@/lib/creator/creator-consent-policy";

import {
  LocalIdentityRepository,
} from "@/lib/repositories/local-identity-repository";

export type CreatorConsentServerStatus = {
  accepted: boolean;
  creatorAccepted: boolean;
  musicAccepted: boolean;
};

export async function getCreatorConsentServerStatus(
  userId: string,
): Promise<CreatorConsentServerStatus> {
  const repository =
    new LocalIdentityRepository();

  const client =
    await repository.findClientByCode(
      "FLATLIVE",
    );

  if (!client) {
    return {
      accepted: false,
      creatorAccepted: false,
      musicAccepted: false,
    };
  }

  const creatorConsent =
    await repository.findConsent(
      userId,
      client.id,
      "CREATOR_POLICY",
    );

  const musicConsent =
    await repository.findConsent(
      userId,
      client.id,
      "MUSIC_IP_POLICY",
    );

  const creatorAccepted =
    creatorConsent?.status ===
      "GRANTED" &&
    creatorConsent.version ===
      CREATOR_POLICY_VERSION;

  const musicAccepted =
    musicConsent?.status ===
      "GRANTED" &&
    musicConsent.version ===
      MUSIC_IP_POLICY_VERSION;

  return {
    accepted:
      creatorAccepted &&
      musicAccepted,
    creatorAccepted,
    musicAccepted,
  };
}

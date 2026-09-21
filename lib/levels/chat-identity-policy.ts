import type {
  CreatorLevelPolicy,
  ViewerLevelPolicy,
} from "./level-policy";

export type FanDurationType = "THIRTY_DAYS" | "PERMANENT";
export type FanTier = "NONE" | "FAN" | "VIP";

export type LoungeBadge = {
  badgeName: string;
  isActive: boolean;
};

export type ChatIdentityInput = {
  isCurrentBroadcaster: boolean;
  viewerLevel: ViewerLevelPolicy;
  creatorLevel?: CreatorLevelPolicy | null;
  fanTier: FanTier;
  loungeBadge?: LoungeBadge | null;
  isManager: boolean;
};

export type ChatIdentityDisplay = {
  primaryLevelLabel: string;
  primaryLevelType: "VIEWER" | "CREATOR";
  loungeBadgeName: string | null;
  roleIcon: "BROADCASTER" | "MANAGER" | null;
  nicknameTone: "DEFAULT" | "FAN" | "VIP";
  showViewerLevel: boolean;
  showCreatorLevel: boolean;
};

export function resolveChatIdentityDisplay(
  input: ChatIdentityInput,
): ChatIdentityDisplay {
  if (input.isCurrentBroadcaster && input.creatorLevel) {
    return {
      primaryLevelLabel: `FLATIST Lv.${input.creatorLevel.level}`,
      primaryLevelType: "CREATOR",
      loungeBadgeName: null,
      roleIcon: "BROADCASTER",
      nicknameTone: "DEFAULT",
      showViewerLevel: false,
      showCreatorLevel: true,
    };
  }

  return {
    primaryLevelLabel: `Lv.${input.viewerLevel.level}`,
    primaryLevelType: "VIEWER",
    loungeBadgeName:
      input.loungeBadge?.isActive && input.loungeBadge.badgeName.trim()
        ? input.loungeBadge.badgeName.trim()
        : null,
    roleIcon: input.isManager ? "MANAGER" : null,
    nicknameTone:
      input.fanTier === "VIP"
        ? "VIP"
        : input.fanTier === "FAN"
          ? "FAN"
          : "DEFAULT",
    showViewerLevel: true,
    showCreatorLevel: false,
  };
}

export const FAN_MEMBERSHIP_POLICY = {
  fanCard: {
    title: "팬카드",
    hasImage: false,
    messageEditableByBroadcaster: true,
    durationTypes: ["THIRTY_DAYS", "PERMANENT"] as FanDurationType[],
    affectsViewerLevel: false,
  },
  vipPass: {
    title: "VIP 패스",
    hasImage: true,
    messageEditableByBroadcaster: true,
    imageEditableByBroadcaster: true,
    durationTypes: ["THIRTY_DAYS", "PERMANENT"] as FanDurationType[],
    affectsViewerLevel: false,
  },
} as const;

export const SUPPORT_RANKING_POLICY = {
  fanRankingTabEnabled: false,
  liveOnlyTodaySupportRankingEnabled: true,
  broadcasterMyPageDonationRankingEnabled: true,
  affectsViewerLevel: false,
} as const;

export type FanMembershipDurationType = "THIRTY_DAYS" | "PERMANENT";

export type FanCardSettings = {
  broadcasterUserId: string;

  fanEnabled: boolean;
  fanMessage: string;
  fanPriceFlat: number;
  fanDurationType: FanMembershipDurationType;
  fanNicknameColor: string;

  vipEnabled: boolean;
  vipMessage: string;
  vipImageUrl: string;
  vipPriceFlat: number;
  vipDurationType: FanMembershipDurationType;
  vipNicknameColor: string;

  updatedAt: number;
};

export type FanCardSettingsInput = Partial<
  Omit<FanCardSettings, "broadcasterUserId" | "updatedAt">
>;

export const DEFAULT_FAN_CARD_SETTINGS = {
  fanEnabled: true,
  fanMessage:
    "오늘부터 우리 방송 팬이에요. 함께 웃고 응원해줘서 고마워요 💛",
  fanPriceFlat: 500,
  fanDurationType: "THIRTY_DAYS" as FanMembershipDurationType,
  fanNicknameColor: "#FACC15",

  vipEnabled: true,
  vipMessage:
    "가장 특별한 자리에서 함께해줘서 고마워요. VIP 팬은 더 특별하게 표시됩니다 👑",
  vipImageUrl: "",
  vipPriceFlat: 3000,
  vipDurationType: "PERMANENT" as FanMembershipDurationType,
  vipNicknameColor: "#A855F7",
} as const;

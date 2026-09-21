export const FLAT_KRW_RATE = 100 as const;

export type ViewerLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
  11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
  21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 |
  31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 |
  41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50 |
  51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60 |
  61 | 62 | 63 | 64 | 65 | 66 | 67 | 68 | 69 | 70 |
  71 | 72 | 73 | 74 | 75 | 76 | 77 | 78 | 79 | 80 |
  81 | 82 | 83 | 84 | 85 | 86 | 87 | 88 | 89 | 90 |
  91 | 92 | 93 | 94 | 95 | 96 | 97 | 98 | 99 | 100;

export type CreatorLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type ViewerLevelBenefit =
  | "LOUNGE_ENTRY"
  | "ENTRY_BGM"
  | "ENTRY_ANIMATION";

export type ViewerBadgeTier =
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "DIAMOND"
  | "ROYAL"
  | "LEGEND"
  | "MYTHIC"
  | "IMMORTAL"
  | "FLAT";

export type CreatorBadgeTier =
  | "STARTER"
  | "GROWING"
  | "RISING"
  | "PRO"
  | "ELITE"
  | "ASCEND"
  | "ICON"
  | "FLATIST";

export type ViewerLevelPolicy = {
  level: ViewerLevel;
  requiredKrw: number;
  requiredFlat: number;
  badgeTier: ViewerBadgeTier;
  benefits: ViewerLevelBenefit[];
};

export type CreatorLevelPolicy = {
  level: CreatorLevel;
  monthlyLiveHours: number;
  followerCount: number;
  cumulativeLiveDonationKrw: number;
  cumulativeLiveDonationFlat: number;
  badgeTier: CreatorBadgeTier;
  supportRatePercent: number;
  productSupport: boolean;
};

function wonToFlat(won: number) {
  return Math.ceil(won / FLAT_KRW_RATE);
}

function viewerPolicy(level: ViewerLevel, requiredKrw: number): ViewerLevelPolicy {
  const benefits: ViewerLevelBenefit[] = [];

  if (level >= 30) {
    benefits.push("LOUNGE_ENTRY");
  }

  if (level >= 51) {
    benefits.push("ENTRY_BGM");
  }

  if (level >= 81) {
    benefits.push("ENTRY_ANIMATION");
  }

  return {
    level,
    requiredKrw,
    requiredFlat: wonToFlat(requiredKrw),
    badgeTier: getViewerBadgeTier(level),
    benefits,
  };
}

export const VIEWER_LEVEL_POLICIES: ViewerLevelPolicy[] = [
  viewerPolicy(1, 0),
  viewerPolicy(2, 10000),
  viewerPolicy(3, 20000),
  viewerPolicy(4, 30000),
  viewerPolicy(5, 40000),
  viewerPolicy(6, 50000),
  viewerPolicy(7, 60000),
  viewerPolicy(8, 70000),
  viewerPolicy(9, 80000),
  viewerPolicy(10, 100000),

  viewerPolicy(11, 150000),
  viewerPolicy(12, 180000),
  viewerPolicy(13, 220000),
  viewerPolicy(14, 260000),
  viewerPolicy(15, 300000),
  viewerPolicy(16, 340000),
  viewerPolicy(17, 380000),
  viewerPolicy(18, 420000),
  viewerPolicy(19, 460000),
  viewerPolicy(20, 500000),

  viewerPolicy(21, 550000),
  viewerPolicy(22, 600000),
  viewerPolicy(23, 650000),
  viewerPolicy(24, 700000),
  viewerPolicy(25, 750000),
  viewerPolicy(26, 800000),
  viewerPolicy(27, 850000),
  viewerPolicy(28, 900000),
  viewerPolicy(29, 950000),
  viewerPolicy(30, 1000000),

  viewerPolicy(31, 1600000),
  viewerPolicy(32, 2200000),
  viewerPolicy(33, 2800000),
  viewerPolicy(34, 3400000),
  viewerPolicy(35, 4000000),
  viewerPolicy(36, 4600000),
  viewerPolicy(37, 5200000),
  viewerPolicy(38, 5800000),
  viewerPolicy(39, 6400000),
  viewerPolicy(40, 7000000),

  viewerPolicy(41, 9000000),
  viewerPolicy(42, 11000000),
  viewerPolicy(43, 13000000),
  viewerPolicy(44, 16000000),
  viewerPolicy(45, 18000000),
  viewerPolicy(46, 20000000),
  viewerPolicy(47, 23000000),
  viewerPolicy(48, 25000000),
  viewerPolicy(49, 28000000),
  viewerPolicy(50, 30000000),

  viewerPolicy(51, 35000000),
  viewerPolicy(52, 38000000),
  viewerPolicy(53, 42000000),
  viewerPolicy(54, 46000000),
  viewerPolicy(55, 50000000),
  viewerPolicy(56, 54000000),
  viewerPolicy(57, 58000000),
  viewerPolicy(58, 62000000),
  viewerPolicy(59, 66000000),
  viewerPolicy(60, 70000000),

  viewerPolicy(61, 75000000),
  viewerPolicy(62, 85000000),
  viewerPolicy(63, 95000000),
  viewerPolicy(64, 105000000),
  viewerPolicy(65, 110000000),
  viewerPolicy(66, 115000000),
  viewerPolicy(67, 125000000),
  viewerPolicy(68, 135000000),
  viewerPolicy(69, 145000000),
  viewerPolicy(70, 150000000),

  viewerPolicy(71, 200000000),
  viewerPolicy(72, 250000000),
  viewerPolicy(73, 300000000),
  viewerPolicy(74, 350000000),
  viewerPolicy(75, 400000000),
  viewerPolicy(76, 450000000),
  viewerPolicy(77, 500000000),
  viewerPolicy(78, 550000000),
  viewerPolicy(79, 600000000),
  viewerPolicy(80, 700000000),

  viewerPolicy(81, 800000000),
  viewerPolicy(82, 850000000),
  viewerPolicy(83, 900000000),
  viewerPolicy(84, 1000000000),
  viewerPolicy(85, 1100000000),
  viewerPolicy(86, 1150000000),
  viewerPolicy(87, 1200000000),
  viewerPolicy(88, 1300000000),
  viewerPolicy(89, 1400000000),
  viewerPolicy(90, 1500000000),

  viewerPolicy(91, 1800000000),
  viewerPolicy(92, 2200000000),
  viewerPolicy(93, 2500000000),
  viewerPolicy(94, 2900000000),
  viewerPolicy(95, 3200000000),
  viewerPolicy(96, 3600000000),
  viewerPolicy(97, 3900000000),
  viewerPolicy(98, 4300000000),
  viewerPolicy(99, 4500000000),
  viewerPolicy(100, 5000000000),
];

export const CREATOR_LEVEL_POLICIES: CreatorLevelPolicy[] = [
  {
    level: 1,
    monthlyLiveHours: 0,
    followerCount: 0,
    cumulativeLiveDonationKrw: 0,
    cumulativeLiveDonationFlat: 0,
    badgeTier: "STARTER",
    supportRatePercent: 0,
    productSupport: false,
  },
  {
    level: 2,
    monthlyLiveHours: 10,
    followerCount: 300,
    cumulativeLiveDonationKrw: 500000,
    cumulativeLiveDonationFlat: wonToFlat(500000),
    badgeTier: "GROWING",
    supportRatePercent: 0,
    productSupport: false,
  },
  {
    level: 3,
    monthlyLiveHours: 20,
    followerCount: 1000,
    cumulativeLiveDonationKrw: 5000000,
    cumulativeLiveDonationFlat: wonToFlat(5000000),
    badgeTier: "GROWING",
    supportRatePercent: 0,
    productSupport: false,
  },
  {
    level: 4,
    monthlyLiveHours: 30,
    followerCount: 3000,
    cumulativeLiveDonationKrw: 10000000,
    cumulativeLiveDonationFlat: wonToFlat(10000000),
    badgeTier: "RISING",
    supportRatePercent: 0,
    productSupport: false,
  },
  {
    level: 5,
    monthlyLiveHours: 40,
    followerCount: 5000,
    cumulativeLiveDonationKrw: 30000000,
    cumulativeLiveDonationFlat: wonToFlat(30000000),
    badgeTier: "PRO",
    supportRatePercent: 0,
    productSupport: false,
  },
  {
    level: 6,
    monthlyLiveHours: 50,
    followerCount: 10000,
    cumulativeLiveDonationKrw: 50000000,
    cumulativeLiveDonationFlat: wonToFlat(50000000),
    badgeTier: "ELITE",
    supportRatePercent: 1,
    productSupport: true,
  },
  {
    level: 7,
    monthlyLiveHours: 60,
    followerCount: 50500,
    cumulativeLiveDonationKrw: 100000000,
    cumulativeLiveDonationFlat: wonToFlat(100000000),
    badgeTier: "ASCEND",
    supportRatePercent: 2,
    productSupport: true,
  },
  {
    level: 8,
    monthlyLiveHours: 70,
    followerCount: 100000,
    cumulativeLiveDonationKrw: 300000000,
    cumulativeLiveDonationFlat: wonToFlat(300000000),
    badgeTier: "ICON",
    supportRatePercent: 3,
    productSupport: true,
  },
  {
    level: 9,
    monthlyLiveHours: 80,
    followerCount: 500000,
    cumulativeLiveDonationKrw: 500000000,
    cumulativeLiveDonationFlat: wonToFlat(500000000),
    badgeTier: "FLATIST",
    supportRatePercent: 4,
    productSupport: true,
  },
  {
    level: 10,
    monthlyLiveHours: 90,
    followerCount: 1000000,
    cumulativeLiveDonationKrw: 1000000000,
    cumulativeLiveDonationFlat: wonToFlat(1000000000),
    badgeTier: "FLATIST",
    supportRatePercent: 5,
    productSupport: true,
  },
];

export function getViewerBadgeTier(level: ViewerLevel): ViewerBadgeTier {
  if (level >= 91) return "FLAT";
  if (level >= 81) return "IMMORTAL";
  if (level >= 71) return "MYTHIC";
  if (level >= 61) return "LEGEND";
  if (level >= 51) return "ROYAL";
  if (level >= 41) return "DIAMOND";
  if (level >= 31) return "PLATINUM";
  if (level >= 21) return "GOLD";
  if (level >= 11) return "SILVER";
  return "BRONZE";
}

export function getViewerLevelByLiveDonationFlat(
  cumulativeLiveDonationFlat: number,
): ViewerLevelPolicy {
  const safeFlat = Number.isFinite(cumulativeLiveDonationFlat)
    ? Math.max(0, Math.floor(cumulativeLiveDonationFlat))
    : 0;

  let matched = VIEWER_LEVEL_POLICIES[0];

  for (const policy of VIEWER_LEVEL_POLICIES) {
    if (safeFlat >= policy.requiredFlat) {
      matched = policy;
    } else {
      break;
    }
  }

  return matched;
}

export type CreatorLevelInput = {
  monthlyLiveDurationMs: number;
  followerCount: number;
  cumulativeLiveDonationReceivedFlat: number;
  hasLiveBroadcastHistory: boolean;
};

export type CreatorLevelResult = {
  level: CreatorLevelPolicy;
  eligibleLevelByAllConditions: CreatorLevelPolicy;
  visibleLevelByMonthlyHours: CreatorLevelPolicy;
  isLiveCreator: boolean;
};

export function getCreatorLevel(input: CreatorLevelInput): CreatorLevelResult {
  if (!input.hasLiveBroadcastHistory) {
    return {
      level: CREATOR_LEVEL_POLICIES[0],
      eligibleLevelByAllConditions: CREATOR_LEVEL_POLICIES[0],
      visibleLevelByMonthlyHours: CREATOR_LEVEL_POLICIES[0],
      isLiveCreator: false,
    };
  }

  const monthlyHours = Math.max(
    0,
    Math.floor(input.monthlyLiveDurationMs / 1000 / 60 / 60),
  );

  const followerCount = Number.isFinite(input.followerCount)
    ? Math.max(0, Math.floor(input.followerCount))
    : 0;

  const donationFlat = Number.isFinite(
    input.cumulativeLiveDonationReceivedFlat,
  )
    ? Math.max(0, Math.floor(input.cumulativeLiveDonationReceivedFlat))
    : 0;

  let eligibleLevelByAllConditions = CREATOR_LEVEL_POLICIES[0];
  let visibleLevelByMonthlyHours = CREATOR_LEVEL_POLICIES[0];

  for (const policy of CREATOR_LEVEL_POLICIES) {
    if (
      monthlyHours >= policy.monthlyLiveHours &&
      followerCount >= policy.followerCount &&
      donationFlat >= policy.cumulativeLiveDonationFlat
    ) {
      eligibleLevelByAllConditions = policy;
    }

    if (monthlyHours >= policy.monthlyLiveHours) {
      visibleLevelByMonthlyHours = policy;
    }
  }

  const level =
    eligibleLevelByAllConditions.level < visibleLevelByMonthlyHours.level
      ? eligibleLevelByAllConditions
      : visibleLevelByMonthlyHours;

  return {
    level,
    eligibleLevelByAllConditions,
    visibleLevelByMonthlyHours,
    isLiveCreator: true,
  };
}

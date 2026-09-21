import fs from "fs/promises";
import path from "path";

import type {
  FitActivityConfig,
  FitActivityRule,
} from "./types";

const FILE_PATH = path.join(
  process.cwd(),
  "data",
  "fit-activity-config.json",
);

const DEFAULT_PURCHASE_REWARD_PERCENT = 1;

const DEFAULT_RULES: FitActivityRule[] = [
  { code: "DAILY_LOGIN", label: "일일 로그인", category: "계정", enabled: true, rewardFit: 10, watchSeconds: null, dailyCountLimit: 1, dailyFitLimit: 10, description: "하루 첫 로그인 활동" },
  { code: "PROFILE_COMPLETE", label: "프로필 완성", category: "계정", enabled: true, rewardFit: 30, watchSeconds: null, dailyCountLimit: 1, dailyFitLimit: 30, description: "프로필 필수 항목 완성" },

  { code: "LIVE_WATCH", label: "LIVE 시청", category: "LIVE", enabled: true, rewardFit: 10, watchSeconds: null, dailyCountLimit: 5, dailyFitLimit: 50, description: "운영 조건을 충족한 LIVE 시청" },
  { code: "LIVE_CHAT", label: "LIVE 댓글", category: "LIVE", enabled: true, rewardFit: 2, watchSeconds: null, dailyCountLimit: 10, dailyFitLimit: 20, description: "정상적인 LIVE 댓글 활동" },
  { code: "LIVE_LIKE", label: "LIVE 좋아요", category: "LIVE", enabled: true, rewardFit: 1, watchSeconds: null, dailyCountLimit: 20, dailyFitLimit: 20, description: "LIVE 무료 좋아요 활동" },
  { code: "LIVE_SHARE", label: "LIVE 공유", category: "LIVE", enabled: true, rewardFit: 3, watchSeconds: null, dailyCountLimit: 5, dailyFitLimit: 15, description: "LIVE 공유 활동" },
  { code: "LIVE_FOLLOW", label: "LIVE 방송 팔로우", category: "LIVE", enabled: true, rewardFit: 5, watchSeconds: null, dailyCountLimit: 5, dailyFitLimit: 25, description: "방송 계정 팔로우 활동" },
  { code: "LIVE_DONATION", label: "LIVE 후원", category: "LIVE", enabled: false, rewardFit: 0, watchSeconds: null, dailyCountLimit: 10, dailyFitLimit: 0, description: "유료 후원 활동. 기본값은 적립 OFF" },

  { code: "CLUTCH_PARTICIPATE", label: "CLUTCH 참여", category: "CLUTCH", enabled: true, rewardFit: 10, watchSeconds: null, dailyCountLimit: 5, dailyFitLimit: 50, description: "CLUTCH 대결 정상 참여" },
  { code: "CLUTCH_WATCH", label: "CLUTCH 시청", category: "CLUTCH", enabled: true, rewardFit: 5, watchSeconds: null, dailyCountLimit: 5, dailyFitLimit: 25, description: "CLUTCH 시청 조건 달성" },

  { code: "FLIT_WATCH", label: "FLIT 시청", category: "FLIT", enabled: true, rewardFit: 2, watchSeconds: 30, dailyCountLimit: 20, dailyFitLimit: 40, description: "FLIT 시청 조건 달성" },
  { code: "FLIT_LIKE", label: "FLIT 좋아요", category: "FLIT", enabled: true, rewardFit: 1, watchSeconds: null, dailyCountLimit: 20, dailyFitLimit: 20, description: "FLIT 무료 좋아요" },
  { code: "FLIT_COMMENT", label: "FLIT 댓글", category: "FLIT", enabled: true, rewardFit: 2, watchSeconds: null, dailyCountLimit: 10, dailyFitLimit: 20, description: "FLIT 댓글 활동" },
  { code: "FLIT_SHARE", label: "FLIT 공유", category: "FLIT", enabled: true, rewardFit: 3, watchSeconds: null, dailyCountLimit: 5, dailyFitLimit: 15, description: "FLIT 공유 활동" },
  { code: "FLIT_GREAT", label: "FLIT 멋져요", category: "FLIT", enabled: true, rewardFit: 1, watchSeconds: null, dailyCountLimit: 20, dailyFitLimit: 20, description: "유료 멋져요 반응 성공 시 FIT 적립" },
  { code: "FLIT_BEST", label: "FLIT 최고예요", category: "FLIT", enabled: true, rewardFit: 1, watchSeconds: null, dailyCountLimit: 20, dailyFitLimit: 20, description: "유료 최고예요 반응 성공 시 FIT 적립" },

  { code: "VOD_WATCH", label: "VOD 시청", category: "VOD", enabled: true, rewardFit: 2, watchSeconds: 30, dailyCountLimit: 20, dailyFitLimit: 40, description: "VOD 시청 조건 달성" },
  { code: "VOD_LIKE", label: "VOD 좋아요", category: "VOD", enabled: true, rewardFit: 1, watchSeconds: null, dailyCountLimit: 20, dailyFitLimit: 20, description: "VOD 무료 좋아요" },
  { code: "VOD_COMMENT", label: "VOD 댓글", category: "VOD", enabled: true, rewardFit: 2, watchSeconds: null, dailyCountLimit: 10, dailyFitLimit: 20, description: "VOD 댓글 활동" },
  { code: "VOD_GREAT", label: "VOD 멋져요", category: "VOD", enabled: true, rewardFit: 1, watchSeconds: null, dailyCountLimit: 20, dailyFitLimit: 20, description: "유료 멋져요 반응 성공 시 FIT 적립" },
  { code: "VOD_BEST", label: "VOD 최고예요", category: "VOD", enabled: true, rewardFit: 1, watchSeconds: null, dailyCountLimit: 20, dailyFitLimit: 20, description: "유료 최고예요 반응 성공 시 FIT 적립" },

  { code: "FOLLOW_USER", label: "계정 팔로우", category: "소셜", enabled: true, rewardFit: 5, watchSeconds: null, dailyCountLimit: 5, dailyFitLimit: 25, description: "일반 계정 팔로우" },

  { code: "LOUNGE_VISIT", label: "라운지 방문", category: "라운지", enabled: true, rewardFit: 3, watchSeconds: null, dailyCountLimit: 3, dailyFitLimit: 9, description: "라운지 정상 방문" },
  { code: "LOUNGE_ACTIVITY", label: "라운지 활동", category: "라운지", enabled: true, rewardFit: 3, watchSeconds: null, dailyCountLimit: 5, dailyFitLimit: 15, description: "라운지 내 활동" },

  { code: "PLSHOP_VISIT", label: "플핑 방문", category: "플핑", enabled: true, rewardFit: 3, watchSeconds: null, dailyCountLimit: 3, dailyFitLimit: 9, description: "플핑 쇼핑 화면 방문" },
  { code: "PLSHOP_PURCHASE", label: "플핑 구매", category: "플핑", enabled: true, rewardFit: 20, watchSeconds: null, dailyCountLimit: 5, dailyFitLimit: 100, description: "정상 구매 완료" },
  { code: "PLSHOP_REVIEW", label: "플핑 리뷰", category: "플핑", enabled: true, rewardFit: 10, watchSeconds: null, dailyCountLimit: 3, dailyFitLimit: 30, description: "정상 구매 리뷰 작성" },

  { code: "EVENT", label: "이벤트 참여", category: "이벤트", enabled: true, rewardFit: 10, watchSeconds: null, dailyCountLimit: null, dailyFitLimit: null, description: "이벤트별 서버 지급" },
];

function normalizePurchaseRewardPercent(
  value: unknown,
): number {
  const numberValue = Number(value);

  if (
    !Number.isFinite(numberValue) ||
    numberValue < 0 ||
    numberValue > 100
  ) {
    return DEFAULT_PURCHASE_REWARD_PERCENT;
  }

  return Math.round(numberValue * 100) / 100;
}

function normalizePositiveIntegerOrNull(
  value: unknown,
): number | null {
  if (value === null || value === "") return null;
  const numberValue = Number(value);
  if (
    !Number.isSafeInteger(numberValue) ||
    numberValue < 0
  ) {
    return null;
  }
  return numberValue;
}

function normalizeRule(
  source: Partial<FitActivityRule>,
  fallback: FitActivityRule,
): FitActivityRule {
  const rewardFit = Number(source.rewardFit);

  return {
    ...fallback,
    enabled:
      typeof source.enabled === "boolean"
        ? source.enabled
        : fallback.enabled,
    rewardFit:
      Number.isSafeInteger(rewardFit) &&
      rewardFit >= 0
        ? rewardFit
        : fallback.rewardFit,
    watchSeconds:
      fallback.watchSeconds === null
        ? null
        : normalizePositiveIntegerOrNull(
            source.watchSeconds,
          ) ?? fallback.watchSeconds,
    dailyCountLimit:
      source.dailyCountLimit === null
        ? null
        : normalizePositiveIntegerOrNull(
            source.dailyCountLimit,
          ) ?? fallback.dailyCountLimit,
    dailyFitLimit:
      source.dailyFitLimit === null
        ? null
        : normalizePositiveIntegerOrNull(
            source.dailyFitLimit,
          ) ?? fallback.dailyFitLimit,
  };
}

export async function getFitActivityConfig(): Promise<FitActivityConfig> {
  try {
    const parsed = JSON.parse(
      await fs.readFile(FILE_PATH, "utf8"),
    ) as Partial<FitActivityConfig>;

    const incomingRules = Array.isArray(parsed.rules)
      ? parsed.rules
      : [];

    return {
      version: 1,
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date(0).toISOString(),
      purchaseRewardPercent:
        normalizePurchaseRewardPercent(
          parsed.purchaseRewardPercent,
        ),
      rules: DEFAULT_RULES.map((fallback) => {
        const incoming = incomingRules.find(
          (item) => item?.code === fallback.code,
        );
        return incoming
          ? normalizeRule(incoming, fallback)
          : fallback;
      }),
    };
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code !==
      "ENOENT"
    ) {
      throw error;
    }

    return {
      version: 1,
      updatedAt: new Date(0).toISOString(),
      purchaseRewardPercent:
        DEFAULT_PURCHASE_REWARD_PERCENT,
      rules: DEFAULT_RULES,
    };
  }
}

export async function saveFitActivityConfig(
  rules: FitActivityRule[],
  purchaseRewardPercent?: number,
): Promise<FitActivityConfig> {
  const current =
    await getFitActivityConfig();

  const normalizedRules =
    current.rules.map((fallback) => {
      const incoming = rules.find(
        (item) => item.code === fallback.code,
      );

      return incoming
        ? normalizeRule(incoming, fallback)
        : fallback;
    });

  const next: FitActivityConfig = {
    version: 1,
    updatedAt: new Date().toISOString(),
    purchaseRewardPercent:
      purchaseRewardPercent === undefined
        ? current.purchaseRewardPercent
        : normalizePurchaseRewardPercent(
            purchaseRewardPercent,
          ),
    rules: normalizedRules,
  };

  await fs.mkdir(
    path.dirname(FILE_PATH),
    { recursive: true },
  );

  const tempPath = `${FILE_PATH}.tmp`;

  await fs.writeFile(
    tempPath,
    JSON.stringify(next, null, 2) + "\n",
    "utf8",
  );

  await fs.rename(
    tempPath,
    FILE_PATH,
  );

  return next;
}

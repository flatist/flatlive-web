import type {
  SettlementAffiliation,
  SettlementAllocation,
} from "./types";

export const SETTLEMENT_POLICY_VERSION =
  "FLATLIVE-SETTLEMENT-V1";

export const AGENCY_SETTLEMENT_RATES = {
  creator: 60,
  agency: 10,
  branch: 5,
  headManager: 5,
  company: 20,
} as const;

export const INDEPENDENT_SETTLEMENT_RATES = {
  creator: 55,
  agency: 0,
  branch: 0,
  headManager: 0,
  company: 45,
} as const;

function assertGrossAmount(
  grossAmount: number,
) {
  if (
    !Number.isSafeInteger(
      grossAmount,
    ) ||
    grossAmount <= 0
  ) {
    throw new Error(
      "정산 대상 금액은 0보다 큰 정수여야 합니다.",
    );
  }
}

function percentage(
  amount: number,
  rate: number,
) {
  return Math.floor(
    (amount * rate) / 100,
  );
}

export function calculateSettlementAllocation(
  grossAmount: number,
  affiliation: SettlementAffiliation,
): SettlementAllocation {
  assertGrossAmount(
    grossAmount,
  );

  if (
    affiliation ===
    "AGENCY"
  ) {
    const creatorAmount =
      percentage(
        grossAmount,
        AGENCY_SETTLEMENT_RATES.creator,
      );

    const agencyAmount =
      percentage(
        grossAmount,
        AGENCY_SETTLEMENT_RATES.agency,
      );

    const branchAmount =
      percentage(
        grossAmount,
        AGENCY_SETTLEMENT_RATES.branch,
      );

    const headManagerAmount =
      percentage(
        grossAmount,
        AGENCY_SETTLEMENT_RATES.headManager,
      );

    const companyAmount =
      grossAmount -
      creatorAmount -
      agencyAmount -
      branchAmount -
      headManagerAmount;

    return {
      grossAmount,
      affiliation,

      creatorAmount,
      agencyAmount,
      branchAmount,
      headManagerAmount,
      companyAmount,

      creatorRate:
        AGENCY_SETTLEMENT_RATES.creator,

      agencyRate:
        AGENCY_SETTLEMENT_RATES.agency,

      branchRate:
        AGENCY_SETTLEMENT_RATES.branch,

      headManagerRate:
        AGENCY_SETTLEMENT_RATES.headManager,

      companyRate:
        AGENCY_SETTLEMENT_RATES.company,
    };
  }

  const creatorAmount =
    percentage(
      grossAmount,
      INDEPENDENT_SETTLEMENT_RATES.creator,
    );

  const companyAmount =
    grossAmount -
    creatorAmount;

  return {
    grossAmount,
    affiliation:
      "INDEPENDENT",

    creatorAmount,
    agencyAmount: 0,
    branchAmount: 0,
    headManagerAmount: 0,
    companyAmount,

    creatorRate:
      INDEPENDENT_SETTLEMENT_RATES.creator,

    agencyRate: 0,
    branchRate: 0,
    headManagerRate: 0,

    companyRate:
      INDEPENDENT_SETTLEMENT_RATES.company,
  };
}

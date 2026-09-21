export type SettlementAffiliation =
  | "AGENCY"
  | "INDEPENDENT";

export type SettlementAllocation = {
  grossAmount: number;

  affiliation: SettlementAffiliation;

  creatorAmount: number;
  agencyAmount: number;
  branchAmount: number;
  headManagerAmount: number;
  companyAmount: number;

  creatorRate: number;
  agencyRate: number;
  branchRate: number;
  headManagerRate: number;
  companyRate: number;
};

import type {
  AssetBalance,
  LedgerTransaction,
  WalletAccountKey,
} from "./types";

export interface WalletRepository {
  getBalance(account: WalletAccountKey): Promise<AssetBalance>;
  listTransactions(account: WalletAccountKey, limit?: number): Promise<LedgerTransaction[]>;
  listAllTransactions(account: WalletAccountKey): Promise<LedgerTransaction[]>;

  findByIdempotencyKey(
    account: WalletAccountKey,
    idempotencyKey: string,
  ): Promise<LedgerTransaction | null>;

  /**
   * 개발용 로컬 원장 append 계약.
   * 기존 거래를 수정/삭제하지 않고 새 거래만 추가한다.
   * 실제 PG/후원 연결 시 idempotencyKey를 필수화한다.
   */
  append(transaction: LedgerTransaction): Promise<LedgerTransaction>;

  /**
   * 실제 거래용 원자적 append.
   * balanceBefore / balanceAfter는 호출자가 계산하지 않고
   * Repository가 최신 원장 잔액을 기준으로 내부에서 계산한다.
   *
   * 실제 DB 전환 시 이 경계를 DB transaction으로 구현한다.
   */
  appendComputed(
    transaction: Omit<LedgerTransaction, "balanceBefore" | "balanceAfter">,
  ): Promise<LedgerTransaction>;

  /**
   * 원거래 삭제 대신 반대 방향의 새 거래를 기록한다.
   */
  reverse(
    originalTransactionId: string,
    reversalTransaction: LedgerTransaction,
  ): Promise<LedgerTransaction>;
}

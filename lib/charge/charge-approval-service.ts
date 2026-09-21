import {
  findChargeOrder,
  markChargeOrderPaid,
} from "@/lib/charge/local-charge-order-store";
import { WalletService } from "@/lib/wallet/wallet-service";

export type ApproveChargeResult = {
  orderId: string;
  orderStatus: "PAID";
  creditedNow: boolean;
  walletTransactionId: string | null;
  balance: number;
  traceId: string;
};

export async function approveChargeOrder(
  orderId: string,
): Promise<ApproveChargeResult> {
  const order =
    await findChargeOrder(orderId);

  if (!order) {
    throw new Error(
      "충전 주문을 찾을 수 없습니다.",
    );
  }

  if (
    order.status !== "PENDING" &&
    order.status !== "PAID"
  ) {
    throw new Error(
      `승인할 수 없는 주문 상태입니다. 현재 상태: ${order.status}`,
    );
  }

  const walletService =
    new WalletService();

  const idempotencyKey =
    `charge-credit:${order.orderId}`;

  const transactionId =
    `charge-credit:${order.orderId}`;

  let walletTransaction =
    await walletService
      .findTransactionByIdempotencyKey(
        order.userId,
        "FLAT",
        idempotencyKey,
      );

  /*
   * 주문은 이미 PAID인데
   * Wallet CREDIT이 없다면
   * 자동으로 새 돈을 만들지 않는다.
   *
   * 결제/지갑 상태 불일치이므로
   * 운영자가 확인해야 하는 오류로 처리한다.
   */
  if (
    order.status === "PAID" &&
    !walletTransaction
  ) {
    throw new Error(
      "CHARGE_STATE_MISMATCH: PAID 주문의 Wallet CREDIT을 찾을 수 없습니다.",
    );
  }

  /*
   * 기존 거래가 존재한다면
   * 단순히 idempotencyKey만 같다고 믿지 않고
   * 이 충전 주문에 정확히 대응하는 거래인지 검증한다.
   */
  if (walletTransaction) {
    const validExistingTransaction =
      walletTransaction.transactionId === transactionId &&
      walletTransaction.idempotencyKey === idempotencyKey &&
      walletTransaction.direction === "CREDIT" &&
      walletTransaction.assetType === "FLAT" &&
      walletTransaction.amount === order.chargeAmount &&
      walletTransaction.sourceType === "CHARGE_PAYMENT" &&
      walletTransaction.sourceId === order.orderId &&
      walletTransaction.status === "POSTED";

    if (!validExistingTransaction) {
      throw new Error(
        "CHARGE_WALLET_MISMATCH: 기존 Wallet 거래가 충전 주문과 일치하지 않습니다.",
      );
    }
  }

  let creditedNow = false;

  if (!walletTransaction) {
    try {
      walletTransaction =
        await walletService
          .createTransaction({
            userId:
              order.userId,

            assetType:
              "FLAT",

            amount:
              order.chargeAmount,

            direction:
              "CREDIT",

            transactionId,
            idempotencyKey,

            sourceType:
              "CHARGE_PAYMENT",

            sourceId:
              order.orderId,
          });

      creditedNow = true;
    } catch (error) {
      /*
       * 동일 주문이 동시에 승인된 경우
       * 다른 요청이 먼저 Wallet CREDIT을
       * 만들었는지 다시 확인한다.
       */
      const recovered =
        await walletService
          .findTransactionByIdempotencyKey(
            order.userId,
            "FLAT",
            idempotencyKey,
          );

      if (!recovered) {
        throw error;
      }

      const validRecoveredTransaction =
        recovered.transactionId === transactionId &&
        recovered.idempotencyKey === idempotencyKey &&
        recovered.direction === "CREDIT" &&
        recovered.assetType === "FLAT" &&
        recovered.amount === order.chargeAmount &&
        recovered.sourceType === "CHARGE_PAYMENT" &&
        recovered.sourceId === order.orderId &&
        recovered.status === "POSTED";

      if (!validRecoveredTransaction) {
        throw new Error(
          "CHARGE_WALLET_MISMATCH: 복구된 Wallet 거래가 충전 주문과 일치하지 않습니다.",
        );
      }

      walletTransaction =
        recovered;
    }
  }

  /*
   * Wallet CREDIT이 존재하는 것이
   * 확인된 뒤에만 주문을 PAID 처리한다.
   */
  const paidOrder =
    await markChargeOrderPaid(
      order.orderId,
    );

  const balance =
    await walletService.getBalance(
      order.userId,
      "FLAT",
    );

  return {
    orderId:
      order.orderId,

    orderStatus:
      paidOrder.status as "PAID",

    creditedNow,

    walletTransactionId:
      walletTransaction?.transactionId ??
      null,

    balance:
      balance.balance,

    traceId:
      order.traceId,
  };
}

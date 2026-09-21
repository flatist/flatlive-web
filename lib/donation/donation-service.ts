import {
  appendDonationTrace,
  type DonationTraceEventType,
} from "@/lib/donation/donation-trace";
import { WalletService } from "@/lib/wallet/wallet-service";
import { clutchService } from "@/lib/live/match/clutch-service";

type SendDonationInput = {
  senderUserId: string;
  receiverUserId: string;
  amount: number;
  donationId: string;
  donationMode?: "single" | "repeat" | "sequence";
};

type TraceInput = {
  donationId: string;
  eventType: DonationTraceEventType;
  senderUserId?: string;
  receiverUserId?: string;
  amount?: number;
  donationMode?: "single" | "repeat" | "sequence";
  transactionId?: string;
  errorMessage?: string;
};

async function safeTrace(input: TraceInput) {
  try {
    await appendDonationTrace({
      eventId: `donation_event_${Date.now()}_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      ...input,
    });
  } catch (error) {
    console.error(
      "[DONATION_TRACE_WRITE_FAILED]",
      input.donationId,
      input.eventType,
      error,
    );
  }
}

export class DonationService {
  private walletService = new WalletService();

  async sendDonation(input: SendDonationInput) {
    if (!input.senderUserId || !input.receiverUserId) {
      throw new Error("후원 사용자 정보가 필요합니다.");
    }

    if (input.senderUserId === input.receiverUserId) {
      throw new Error("자기 자신에게 후원할 수 없습니다.");
    }

    if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
      throw new Error("후원 금액이 올바르지 않습니다.");
    }

    if (!input.donationId) {
      throw new Error("donationId가 필요합니다.");
    }

    await safeTrace({
      donationId: input.donationId,
      eventType: "DONATION_STARTED",
      senderUserId: input.senderUserId,
      receiverUserId: input.receiverUserId,
      amount: input.amount,
      donationMode:
        input.donationMode ?? "single",
    });

    const senderBalance = await this.walletService.getBalance(
      input.senderUserId,
      "FLAT",
    );

    if (senderBalance.balance < input.amount) {
      await safeTrace({
        donationId: input.donationId,
        eventType: "FAILED",
        senderUserId: input.senderUserId,
        receiverUserId: input.receiverUserId,
        amount: input.amount,
        errorMessage: "잔액이 부족합니다.",
      });

      throw new Error("잔액이 부족합니다.");
    }

    const senderTransactionId = `${input.donationId}_sender`;
    const receiverTransactionId = `${input.donationId}_receiver`;

    let sender;

    try {
      sender = await this.walletService.createTransaction({
        userId: input.senderUserId,
        assetType: "FLAT",
        amount: input.amount,
        direction: "DEBIT",
        transactionId: senderTransactionId,
        idempotencyKey: senderTransactionId,
        sourceType: "DONATION",
        sourceId: input.donationId,
      });
    } catch (error) {
      await safeTrace({
        donationId: input.donationId,
        eventType: "FAILED",
        senderUserId: input.senderUserId,
        receiverUserId: input.receiverUserId,
        amount: input.amount,
        transactionId: senderTransactionId,
        errorMessage:
          error instanceof Error
            ? error.message
            : "UNKNOWN_ERROR",
      });

      throw error;
    }

    await safeTrace({
      donationId: input.donationId,
      eventType: "SENDER_DEBITED",
      senderUserId: input.senderUserId,
      receiverUserId: input.receiverUserId,
      amount: input.amount,
      transactionId: sender.transactionId,
    });

    try {
      const receiver =
        await this.walletService.creditCreatorDonationRevenue({
          userId: input.receiverUserId,
          amount: input.amount,
          transactionId: receiverTransactionId,
          idempotencyKey: receiverTransactionId,
          donationId: input.donationId,
        });

      await safeTrace({
        donationId: input.donationId,
        eventType: "RECEIVER_CREDITED",
        senderUserId: input.senderUserId,
        receiverUserId: input.receiverUserId,
        amount: input.amount,
        transactionId: receiver.transactionId,
      });

      const verifiedReceiver =
        receiver.direction === "CREDIT" &&
        receiver.assetType === "FLAT" &&
        receiver.amount === input.amount &&
        receiver.sourceType === "DONATION" &&
        receiver.sourceId === input.donationId &&
        receiver.status === "POSTED" &&
        receiver.transactionId ===
          receiverTransactionId;

      if (!verifiedReceiver) {
        throw new Error(
          "DONATION_RECEIVER_TRANSACTION_INVALID",
        );
      }

      try {
        const scored =
          await clutchService
            .recordVerifiedDonationScore({
              donationId:
                input.donationId,
              walletTransactionId:
                receiver.transactionId,
              senderUserId:
                input.senderUserId,
              receiverUserId:
                input.receiverUserId,
              flatAmount:
                input.amount,
            });

        if (scored) {
          console.log(
            "[CLUTCH_SCORE_RECORDED]",
            {
              donationId:
                input.donationId,
              receiverUserId:
                input.receiverUserId,
              score:
                input.amount,
            },
          );
        }
      } catch (scoreError) {
        console.error(
          "[CLUTCH_SCORE_WRITE_FAILED]",
          {
            donationId:
              input.donationId,
            receiverUserId:
              input.receiverUserId,
            error:
              scoreError instanceof Error
                ? scoreError.message
                : "UNKNOWN_ERROR",
          },
        );
      }

      await safeTrace({
        donationId: input.donationId,
        eventType: "COMPLETED",
        senderUserId: input.senderUserId,
        receiverUserId: input.receiverUserId,
        amount: input.amount,
      });

      return {
        donationId: input.donationId,
        amount: input.amount,
        sender,
        receiver,
        compensated: false,
      };
    } catch (receiverError) {
      const receiverErrorMessage =
        receiverError instanceof Error
          ? receiverError.message
          : "UNKNOWN_ERROR";

      await safeTrace({
        donationId: input.donationId,
        eventType: "RECEIVER_FAILED",
        senderUserId: input.senderUserId,
        receiverUserId: input.receiverUserId,
        amount: input.amount,
        transactionId: receiverTransactionId,
        errorMessage: receiverErrorMessage,
      });

      await safeTrace({
        donationId: input.donationId,
        eventType: "COMPENSATION_STARTED",
        senderUserId: input.senderUserId,
        receiverUserId: input.receiverUserId,
        amount: input.amount,
        transactionId: sender.transactionId,
      });

      try {
        const currentSenderBalance =
          await this.walletService.getBalance(
            input.senderUserId,
            "FLAT",
          );

        const compensationTransactionId =
          `${input.donationId}_sender_compensation`;

        const compensation =
          await this.walletService.reverseLedgerEntry(
            sender.transactionId,
            {
              transactionId: compensationTransactionId,
              walletId: sender.walletId,
              legalEntity: sender.legalEntity,
              ownerType: sender.ownerType,
              ownerId: sender.ownerId,
              assetType: sender.assetType,
              amount: sender.amount,
              direction: "CREDIT",
              balanceBefore: currentSenderBalance.balance,
              balanceAfter:
                currentSenderBalance.balance + sender.amount,
              sourceType: "DONATION_COMPENSATION",
              sourceId: input.donationId,
              status: "POSTED",
              reversedTransactionId: sender.transactionId,
              idempotencyKey: compensationTransactionId,
              createdAt: new Date().toISOString(),
            },
          );

        await safeTrace({
          donationId: input.donationId,
          eventType: "COMPENSATION_COMPLETED",
          senderUserId: input.senderUserId,
          receiverUserId: input.receiverUserId,
          amount: input.amount,
          transactionId: compensation.transactionId,
        });

        await safeTrace({
          donationId: input.donationId,
          eventType: "FAILED",
          senderUserId: input.senderUserId,
          receiverUserId: input.receiverUserId,
          amount: input.amount,
          errorMessage: receiverErrorMessage,
        });

        throw new Error(
          `후원 수신 처리 실패로 발신자 차감을 복구했습니다: ${receiverErrorMessage}`,
        );
      } catch (compensationError) {
        const compensationErrorMessage =
          compensationError instanceof Error
            ? compensationError.message
            : "UNKNOWN_ERROR";

        if (
          compensationErrorMessage.startsWith(
            "후원 수신 처리 실패로 발신자 차감을 복구했습니다:",
          )
        ) {
          throw compensationError;
        }

        await safeTrace({
          donationId: input.donationId,
          eventType: "COMPENSATION_FAILED",
          senderUserId: input.senderUserId,
          receiverUserId: input.receiverUserId,
          amount: input.amount,
          transactionId: sender.transactionId,
          errorMessage: compensationErrorMessage,
        });

        await safeTrace({
          donationId: input.donationId,
          eventType: "FAILED",
          senderUserId: input.senderUserId,
          receiverUserId: input.receiverUserId,
          amount: input.amount,
          errorMessage:
            `수신 실패: ${receiverErrorMessage} / ` +
            `복구 실패: ${compensationErrorMessage}`,
        });

        throw new Error(
          `후원 수신 처리와 발신자 복구가 모두 실패했습니다. donationId=${input.donationId}`,
        );
      }
    }
  }
}

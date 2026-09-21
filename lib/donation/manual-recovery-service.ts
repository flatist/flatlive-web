import {
  appendDonationTrace,
  getDonationTrace,
} from "@/lib/donation/donation-trace";

import { WalletService } from "@/lib/wallet/wallet-service";
import { LocalAuditLogRepository } from "@/lib/audit/local-audit-log-repository";
import type { Role } from "@/lib/auth/permissions";

type ManualRecoveryInput = {
  donationId: string;
  adminUserId: string;
  adminRole: Role;
  reason: string;
};

export class ManualRecoveryService {
  private walletService = new WalletService();
  private auditLogRepository = new LocalAuditLogRepository();

  async recover(input: ManualRecoveryInput) {
    const donationId = input.donationId.trim();
    const reason = input.reason.trim();

    if (!donationId) {
      throw new Error("donationId가 필요합니다.");
    }

    if (!input.adminUserId) {
      throw new Error("처리 관리자 정보가 필요합니다.");
    }

    if (!reason) {
      throw new Error("수동복구 사유가 필요합니다.");
    }

    const trace = await getDonationTrace(donationId);

    if (trace.length === 0) {
      throw new Error("후원 기록을 찾을 수 없습니다.");
    }

    const alreadyRecovered = trace.some(
      (event) =>
        event.eventType === "MANUAL_RECOVERY_COMPLETED",
    );

    if (alreadyRecovered) {
      throw new Error("이미 수동복구 완료된 후원입니다.");
    }

    const compensationFailed = trace.some(
      (event) =>
        event.eventType === "COMPENSATION_FAILED",
    );

    if (!compensationFailed) {
      throw new Error(
        "자동복구 실패가 확인된 후원만 수동복구할 수 있습니다.",
      );
    }

    const started = trace.find(
      (event) =>
        event.eventType === "DONATION_STARTED",
    );

    const senderDebited = trace.find(
      (event) =>
        event.eventType === "SENDER_DEBITED",
    );

    if (!started?.senderUserId) {
      throw new Error("후원 발신자 정보를 찾을 수 없습니다.");
    }

    if (
      !started.amount ||
      !Number.isSafeInteger(started.amount) ||
      started.amount <= 0
    ) {
      throw new Error("복구 금액을 확인할 수 없습니다.");
    }

    if (!senderDebited?.transactionId) {
      throw new Error("발신자 차감 거래를 찾을 수 없습니다.");
    }

    const recoveryTransactionId =
      `${donationId}_manual_recovery`;

    const senderBalance =
      await this.walletService.getBalance(
        started.senderUserId,
        "FLAT",
      );

    await appendDonationTrace({
      eventId:
        `donation_event_${Date.now()}_${crypto.randomUUID()}`,
      donationId,
      eventType: "MANUAL_RECOVERY_STARTED",
      createdAt: new Date().toISOString(),
      senderUserId: started.senderUserId,
      receiverUserId: started.receiverUserId,
      amount: started.amount,
      transactionId: recoveryTransactionId,
      errorMessage:
        `adminUserId=${input.adminUserId}; reason=${reason}`,
    });

    try {
      const recovery =
        await this.walletService.createTransaction({
          userId: started.senderUserId,
          assetType: "FLAT",
          amount: started.amount,
          direction: "CREDIT",
          transactionId: recoveryTransactionId,
          idempotencyKey: recoveryTransactionId,
          sourceType: "DONATION_MANUAL_RECOVERY",
          sourceId: donationId,
        });

      await appendDonationTrace({
        eventId:
          `donation_event_${Date.now()}_${crypto.randomUUID()}`,
        donationId,
        eventType: "MANUAL_RECOVERY_COMPLETED",
        createdAt: new Date().toISOString(),
        senderUserId: started.senderUserId,
        receiverUserId: started.receiverUserId,
        amount: started.amount,
        transactionId: recovery.transactionId,
        errorMessage:
          `adminUserId=${input.adminUserId}; reason=${reason}`,
      });

      await this.auditLogRepository.append({
        adminUserId: input.adminUserId,
        adminRole: input.adminRole,
        action: "DONATION_MANUAL_RECOVERY",
        targetType: "DONATION",
        targetId: donationId,
        reason,
        result: "SUCCESS",
        metadata: {
          recoveredUserId: started.senderUserId,
          amount: started.amount,
          assetType: "FLAT",
          balanceBefore: senderBalance.balance,
          balanceAfter: recovery.balanceAfter,
          transactionId: recovery.transactionId,
        },
      });

      return {
        donationId,
        recoveredUserId: started.senderUserId,
        amount: started.amount,
        balanceBefore: senderBalance.balance,
        balanceAfter: recovery.balanceAfter,
        transactionId: recovery.transactionId,
        adminUserId: input.adminUserId,
        reason,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR";

      await appendDonationTrace({
        eventId:
          `donation_event_${Date.now()}_${crypto.randomUUID()}`,
        donationId,
        eventType: "MANUAL_RECOVERY_FAILED",
        createdAt: new Date().toISOString(),
        senderUserId: started.senderUserId,
        receiverUserId: started.receiverUserId,
        amount: started.amount,
        transactionId: recoveryTransactionId,
        errorMessage:
          `adminUserId=${input.adminUserId}; reason=${reason}; error=${errorMessage}`,
      });

      await this.auditLogRepository.append({
        adminUserId: input.adminUserId,
        adminRole: input.adminRole,
        action: "DONATION_MANUAL_RECOVERY",
        targetType: "DONATION",
        targetId: donationId,
        reason,
        result: "FAILED",
        metadata: {
          recoveredUserId: started.senderUserId,
          amount: started.amount,
          assetType: "FLAT",
          transactionId: recoveryTransactionId,
          error: errorMessage,
        },
      });

      throw error;
    }
  }
}

import type {
  FanMembershipPurchaseInput,
  FanMembershipRevokeInput,
} from "./fan-membership-types";
import { LocalFanMembershipStore } from "./local-fan-membership-store";

const store = new LocalFanMembershipStore();

export class FanMembershipService {
  async getActiveMembership(
    broadcasterUserId: string,
    viewerUserId: string,
  ) {
    return store.getActiveMembership(broadcasterUserId, viewerUserId);
  }

  async listByBroadcaster(broadcasterUserId: string) {
    return store.listByBroadcaster(broadcasterUserId);
  }

  async purchaseMembership(input: FanMembershipPurchaseInput) {
    return store.purchaseMembership(input);
  }

  async revokeMembership(input: FanMembershipRevokeInput) {
    return store.revokeMembership(input);
  }
}

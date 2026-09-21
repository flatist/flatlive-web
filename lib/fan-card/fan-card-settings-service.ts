import { LocalFanCardSettingsStore } from "./local-fan-card-settings-store";
import type {
  FanCardSettings,
  FanCardSettingsInput,
} from "./fan-card-types";

export class FanCardSettingsService {
  private readonly store = new LocalFanCardSettingsStore();

  getSettings(broadcasterUserId: string): Promise<FanCardSettings> {
    if (!broadcasterUserId) {
      throw new Error("broadcasterUserId가 필요합니다.");
    }

    return this.store.getByBroadcasterUserId(broadcasterUserId);
  }

  updateSettings(
    broadcasterUserId: string,
    input: FanCardSettingsInput,
  ): Promise<FanCardSettings> {
    if (!broadcasterUserId) {
      throw new Error("broadcasterUserId가 필요합니다.");
    }

    return this.store.update(broadcasterUserId, input);
  }
}

import type { IdentityRepository } from "@/lib/repositories/identity-repository";
import { LocalIdentityRepository } from "@/lib/repositories/local-identity-repository";
import type {
  ClientCode,
  LoginIdentity,
  LoginProvider,
  ServiceAccessStatus,
} from "@/lib/auth/identity-types";

export type LinkedProviderSummary = {
  provider: LoginProvider;
  loginIdentifier: string;
  verified: boolean;
  providerUserId?: string;
};

export type ServiceAccessSummary = {
  service: ClientCode;
  status: ServiceAccessStatus;
  joinedAt?: string | null;
};

export interface IdentityLinkingService {
  ensurePasswordIdentity(
    userId: string,
    username: string,
    email: string,
    passwordHash: string,
  ): Promise<LoginIdentity>;
  linkIdentity(input: {
    userId: string;
    provider: LoginProvider;
    loginIdentifier: string;
    providerUserId?: string;
    verified?: boolean;
    username?: string;
    email?: string;
    passwordHash?: string;
  }): Promise<LoginIdentity>;
  findProvidersByUserId(userId: string): Promise<LinkedProviderSummary[]>;
  ensureServiceAccess(userId: string, service: ClientCode): Promise<ServiceAccessSummary>;
  getServiceAccessStatus(userId: string, service: ClientCode): Promise<ServiceAccessSummary | null>;
}

export class LocalIdentityLinkingService implements IdentityLinkingService {
  constructor(private readonly identityRepository: IdentityRepository = new LocalIdentityRepository()) {}

  async ensurePasswordIdentity(
    userId: string,
    username: string,
    email: string,
    passwordHash: string,
  ): Promise<LoginIdentity> {
    const normalizedUsername = username.trim();
    const existing = await this.identityRepository.findLoginIdentityByUserId(userId, "PASSWORD");

    if (existing) {
      return existing;
    }

    return this.linkIdentity({
      userId,
      provider: "PASSWORD",
      loginIdentifier: normalizedUsername,
      providerUserId: normalizedUsername,
      verified: true,
      username: normalizedUsername,
      email,
      passwordHash,
    });
  }

  async linkIdentity(input: {
    userId: string;
    provider: LoginProvider;
    loginIdentifier: string;
    providerUserId?: string;
    verified?: boolean;
    username?: string;
    email?: string;
    passwordHash?: string;
  }): Promise<LoginIdentity> {
    const identity = await this.identityRepository.findLoginIdentityByUserId(input.userId, input.provider);

    if (identity) {
      return identity;
    }

    const nextIdentity = {
      id: `li_${Date.now()}-${Math.random().toString(16).slice(2)}`,
      identityId: `id_${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId: input.userId,
      provider: input.provider,
      providerUserId: input.providerUserId ?? input.loginIdentifier,
      loginIdentifier: input.loginIdentifier,
      verified: input.verified ?? false,
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.identityRepository.createLoginIdentity(nextIdentity);
  }

  async findProvidersByUserId(userId: string): Promise<LinkedProviderSummary[]> {
    const identities = await this.identityRepository.findLoginIdentitiesByUserId(userId);

    return identities.map((identity) => ({
      provider: identity.provider,
      loginIdentifier: identity.loginIdentifier,
      verified: identity.verified,
      providerUserId: identity.providerUserId,
    }));
  }

  async ensureServiceAccess(userId: string, service: ClientCode): Promise<ServiceAccessSummary> {
    const clientId =
      service === "FLATLIVE"
        ? "cl_flatlive"
        : service === "GOGOREALBOX"
          ? "cl_gogorealbox"
          : "cl_sia_angel";

    const existing = await this.identityRepository.findServiceAccess(userId, clientId);

    if (existing) {
      return {
        service,
        status: existing.status,
        joinedAt: existing.joinedAt,
      };
    }

    const nextAccess = await this.identityRepository.createServiceAccess({
      id: `sa_${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId,
      service,
      clientId,
      status: service === "FLATLIVE" ? "ACTIVE" : "NOT_JOINED",
      joinedAt: service === "FLATLIVE" ? new Date().toISOString() : null,
      lastAccessAt: service === "FLATLIVE" ? new Date().toISOString() : null,
    });

    return {
      service,
      status: nextAccess.status,
      joinedAt: nextAccess.joinedAt,
    };
  }

  async getServiceAccessStatus(userId: string, service: ClientCode): Promise<ServiceAccessSummary | null> {
    const clientId =
      service === "FLATLIVE"
        ? "cl_flatlive"
        : service === "GOGOREALBOX"
          ? "cl_gogorealbox"
          : "cl_sia_angel";

    const access = await this.identityRepository.findServiceAccess(userId, clientId);

    if (!access) {
      return null;
    }

    return {
      service,
      status: access.status,
      joinedAt: access.joinedAt,
    };
  }
}

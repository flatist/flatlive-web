import type {
  Client,
  Consent,
  LoginIdentity,
  ServiceAccess,
  UnifiedUser,
} from "@/lib/auth/identity-types";
import type {
  EmailVerificationToken,
  PasswordResetToken,
} from "@/lib/auth/token-types";
import type {
  IdentityRepository,
} from "@/lib/repositories/identity-repository";

import {
  LocalIdentityRepository,
} from "@/lib/repositories/local-identity-repository";

import {
  DatabaseIdentityRepository,
} from "@/lib/repositories/database-identity-repository";

export class HybridIdentityRepository
  implements IdentityRepository
{
  private readonly local =
    new LocalIdentityRepository();

  private readonly database =
    new DatabaseIdentityRepository();

  private async readOne<T>(
    databaseRead: () => Promise<T | null>,
    localRead: () => Promise<T | null>,
  ): Promise<T | null> {
    try {
      const value =
        await databaseRead();

      if (value) {
        return value;
      }
    } catch (error) {
      console.error(
        "HYBRID_IDENTITY_DB_READ_ERROR",
        error,
      );
    }

    return localRead();
  }

  async findUnifiedUserById(
    id: string,
  ) {
    return this.readOne(
      () =>
        this.database.findUnifiedUserById(
          id,
        ),
      () =>
        this.local.findUnifiedUserById(
          id,
        ),
    );
  }

  async findUnifiedUserByEmail(
    email: string,
  ) {
    return this.readOne(
      () =>
        this.database.findUnifiedUserByEmail(
          email,
        ),
      () =>
        this.local.findUnifiedUserByEmail(
          email,
        ),
    );
  }

  async findUnifiedUserByUsername(
    username: string,
  ) {
    return this.readOne(
      () =>
        this.database.findUnifiedUserByUsername(
          username,
        ),
      () =>
        this.local.findUnifiedUserByUsername(
          username,
        ),
    );
  }

  async createUnifiedUser(
    user: Omit<
      UnifiedUser,
      "createdAt" |
        "updatedAt"
    >,
  ) {
    const localResult =
      await this.local.createUnifiedUser(
        user,
      );

    try {
      await this.database.createUnifiedUser(
        user,
      );
    } catch (error) {
      console.error(
        "HYBRID_IDENTITY_DB_CREATE_UNIFIED_ERROR",
        error,
      );
    }

    return localResult;
  }

  async updateUnifiedUser(
    id: string,
    updates: Partial<UnifiedUser>,
  ) {
    const localResult =
      await this.local.updateUnifiedUser(
        id,
        updates,
      );

    try {
      await this.database.updateUnifiedUser(
        id,
        updates,
      );
    } catch (error) {
      console.error(
        "HYBRID_IDENTITY_DB_UPDATE_UNIFIED_ERROR",
        error,
      );
    }

    return (
      localResult ??
      this.database.findUnifiedUserById(
        id,
      )
    );
  }

  async findLoginIdentityByUsername(
    username: string,
  ) {
    return this.readOne(
      () =>
        this.database.findLoginIdentityByUsername(
          username,
        ),
      () =>
        this.local.findLoginIdentityByUsername(
          username,
        ),
    );
  }

  async findLoginIdentityByEmail(
    email: string,
  ) {
    return this.readOne(
      () =>
        this.database.findLoginIdentityByEmail(
          email,
        ),
      () =>
        this.local.findLoginIdentityByEmail(
          email,
        ),
    );
  }

  async findLoginIdentityByUserId(
    userId: string,
    provider?: string,
  ) {
    return this.readOne(
      () =>
        this.database.findLoginIdentityByUserId(
          userId,
          provider,
        ),
      () =>
        this.local.findLoginIdentityByUserId(
          userId,
          provider,
        ),
    );
  }

  async findLoginIdentitiesByUserId(
    userId: string,
  ): Promise<LoginIdentity[]> {
    try {
      const rows =
        await this.database.findLoginIdentitiesByUserId(
          userId,
        );

      if (rows.length > 0) {
        return rows;
      }
    } catch (error) {
      console.error(
        "HYBRID_IDENTITY_DB_LIST_IDENTITIES_ERROR",
        error,
      );
    }

    return this.local.findLoginIdentitiesByUserId(
      userId,
    );
  }

  async createLoginIdentity(
    identity: Omit<
      LoginIdentity,
      "createdAt" |
        "updatedAt"
    >,
  ) {

    const localResult =
      await this.local.createLoginIdentity(
        identity,
      );

    try {
      const dbResult =
        await this.database.createLoginIdentity(
          identity,
        );
    } catch (error) {
      console.error(
        "HYBRID_IDENTITY_DB_CREATE_LOGIN_ERROR",
        error,
      );
      throw error;
    }

    return localResult;
  }

  async findClientByCode(
    code: string,
  ) {
    return this.readOne(
      () =>
        this.database.findClientByCode(
          code,
        ),
      () =>
        this.local.findClientByCode(
          code,
        ),
    );
  }

  async createServiceAccess(
    access: Omit<
      ServiceAccess,
      "createdAt" |
        "updatedAt"
    >,
  ) {

    const localResult =
      await this.local.createServiceAccess(
        access,
      );

    try {
      const dbResult =
        await this.database.createServiceAccess(
          access,
        );
    } catch (error) {
      console.error(
        "HYBRID_IDENTITY_DB_CREATE_ACCESS_ERROR",
        error,
      );
      throw error;
    }

    return localResult;
  }

  async findServiceAccess(
    userId: string,
    clientId: string,
  ) {
    return this.readOne(
      () =>
        this.database.findServiceAccess(
          userId,
          clientId,
        ),
      () =>
        this.local.findServiceAccess(
          userId,
          clientId,
        ),
    );
  }

  async updateServiceAccess(
    userId: string,
    clientId: string,
    updates: Partial<ServiceAccess>,
  ) {
    const databaseResult =
      await this.database.updateServiceAccess(
        userId,
        clientId,
        updates,
      );

    const localResult =
      await this.local.updateServiceAccess(
        userId,
        clientId,
        updates,
      );

    return (
      localResult ??
      databaseResult
    );
  }

  async findServiceAccessByUserId(
    userId: string,
    service?: string,
  ) {
    return this.readOne(
      () =>
        this.database.findServiceAccessByUserId(
          userId,
          service,
        ),
      () =>
        this.local.findServiceAccessByUserId(
          userId,
          service,
        ),
    );
  }

  async createConsent(
    consent: Omit<
      Consent,
      "createdAt" |
        "updatedAt"
    >,
  ) {
    const localResult =
      await this.local.createConsent(
        consent,
      );

    try {
      await this.database.createConsent(
        consent,
      );
    } catch (error) {
      console.error(
        "HYBRID_IDENTITY_DB_CREATE_CONSENT_ERROR",
        error,
      );
    }

    return localResult;
  }

  async findConsent(
    userId: string,
    clientId: string,
    consentType: string,
  ) {
    return this.readOne(
      () =>
        this.database.findConsent(
          userId,
          clientId,
          consentType,
        ),
      () =>
        this.local.findConsent(
          userId,
          clientId,
          consentType,
        ),
    );
  }

  async createEmailVerificationToken(
    token: Omit<
      EmailVerificationToken,
      "createdAt"
    >,
  ) {
    const localResult =
      await this.local.createEmailVerificationToken(
        token,
      );

    try {
      await this.database.createEmailVerificationToken(
        token,
      );
    } catch (error) {
      console.error(
        "HYBRID_IDENTITY_DB_CREATE_EMAIL_TOKEN_ERROR",
        error,
      );
    }

    return localResult;
  }

  async findEmailVerificationToken(
    userId: string,
  ) {
    return this.readOne(
      () =>
        this.database.findEmailVerificationToken(
          userId,
        ),
      () =>
        this.local.findEmailVerificationToken(
          userId,
        ),
    );
  }

  async markEmailVerificationTokenAsUsed(
    tokenId: string,
  ): Promise<void> {
    await this.local.markEmailVerificationTokenAsUsed(
      tokenId,
    );

    try {
      await this.database.markEmailVerificationTokenAsUsed(
        tokenId,
      );
    } catch (error) {
      console.error(
        "HYBRID_IDENTITY_DB_MARK_EMAIL_TOKEN_ERROR",
        error,
      );
    }
  }

  async createPasswordResetToken(
    token: Omit<
      PasswordResetToken,
      "createdAt"
    >,
  ) {
    const localResult =
      await this.local.createPasswordResetToken(
        token,
      );

    try {
      await this.database.createPasswordResetToken(
        token,
      );
    } catch (error) {
      console.error(
        "HYBRID_IDENTITY_DB_CREATE_RESET_TOKEN_ERROR",
        error,
      );
    }

    return localResult;
  }

  async findPasswordResetToken(
    userId: string,
  ) {
    return this.readOne(
      () =>
        this.database.findPasswordResetToken(
          userId,
        ),
      () =>
        this.local.findPasswordResetToken(
          userId,
        ),
    );
  }

  async markPasswordResetTokenAsUsed(
    tokenId: string,
  ): Promise<void> {
    await this.local.markPasswordResetTokenAsUsed(
      tokenId,
    );

    try {
      await this.database.markPasswordResetTokenAsUsed(
        tokenId,
      );
    } catch (error) {
      console.error(
        "HYBRID_IDENTITY_DB_MARK_RESET_TOKEN_ERROR",
        error,
      );
    }
  }
}

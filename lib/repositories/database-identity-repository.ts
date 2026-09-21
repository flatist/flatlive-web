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
  pgPool,
} from "@/lib/db/postgres";

function iso(
  value: unknown,
): string {
  if (
    value instanceof Date
  ) {
    return value.toISOString();
  }

  return String(
    value ?? "",
  );
}

function nullableIso(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return iso(value);
}


function nullableDateOnly(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(
      value.getMonth() + 1,
    ).padStart(2, "0");
    const day = String(
      value.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const text =
    String(value).trim();

  const exact =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})/,
    );

  if (exact) {
    return `${exact[1]}-${exact[2]}-${exact[3]}`;
  }

  const parsed =
    new Date(text);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return null;
  }

  const year =
    parsed.getFullYear();

  const month =
    String(
      parsed.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      parsed.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function mapUnifiedUser(
  row: Record<string, unknown>,
): UnifiedUser {
  return {
    id: String(row.id),
    userId: String(
      row.user_id,
    ),
    status:
      row.status as UnifiedUser["status"],
    emailVerifiedAt:
      nullableIso(
        row.email_verified_at,
      ),
    lastLoginAt:
      nullableIso(
        row.last_login_at,
      ),
    displayName:
      row.display_name == null
        ? undefined
        : String(
            row.display_name,
          ),
    username:
      row.username == null
        ? undefined
        : String(
            row.username,
          ),
    email:
      row.email == null
        ? undefined
        : String(
            row.email,
          ),
    birthDate:
      nullableDateOnly(
        row.birth_date,
      ),
    createdAt: iso(
      row.created_at,
    ),
    updatedAt: iso(
      row.updated_at,
    ),
  };
}

function mapLoginIdentity(
  row: Record<string, unknown>,
): LoginIdentity {
  return {
    id: String(row.id),
    identityId: String(
      row.identity_id,
    ),
    userId: String(
      row.user_id,
    ),
    provider:
      row.provider as LoginIdentity["provider"],
    providerUserId:
      row.provider_user_id ==
      null
        ? undefined
        : String(
            row.provider_user_id,
          ),
    loginIdentifier:
      String(
        row.login_identifier,
      ),
    verified: Boolean(
      row.verified,
    ),
    username:
      row.username == null
        ? undefined
        : String(
            row.username,
          ),
    email:
      row.email == null
        ? undefined
        : String(
            row.email,
          ),
    passwordHash:
      row.password_hash == null
        ? undefined
        : String(
            row.password_hash,
          ),
    emailVerifiedAt:
      nullableIso(
        row.email_verified_at,
      ),
    createdAt: iso(
      row.created_at,
    ),
    updatedAt: iso(
      row.updated_at,
    ),
  };
}

function mapClient(
  row: Record<string, unknown>,
): Client {
  return {
    id: String(row.id),
    code:
      row.code as Client["code"],
    name: String(
      row.name,
    ),
    status:
      row.status as Client["status"],
    createdAt: iso(
      row.created_at,
    ),
  };
}

function mapServiceAccess(
  row: Record<string, unknown>,
): ServiceAccess {
  return {
    id: String(row.id),
    userId: String(
      row.user_id,
    ),
    service:
      row.service as ServiceAccess["service"],
    clientId: String(
      row.client_id,
    ),
    status:
      row.status as ServiceAccess["status"],
    joinedAt:
      nullableIso(
        row.joined_at,
      ),
    lastAccessAt:
      nullableIso(
        row.last_access_at,
      ),
    createdAt: iso(
      row.created_at,
    ),
    updatedAt: iso(
      row.updated_at,
    ),
  };
}

function mapConsent(
  row: Record<string, unknown>,
): Consent {
  return {
    id: String(row.id),
    userId: String(
      row.user_id,
    ),
    clientId: String(
      row.client_id,
    ),
    consentType:
      row.consent_type as Consent["consentType"],
    version: String(
      row.version,
    ),
    status:
      row.status as Consent["status"],
    grantedAt:
      nullableIso(
        row.granted_at,
      ),
    revokedAt:
      nullableIso(
        row.revoked_at,
      ),
    createdAt: iso(
      row.created_at,
    ),
    updatedAt: iso(
      row.updated_at,
    ),
  };
}

function mapEmailToken(
  row: Record<string, unknown>,
): EmailVerificationToken {
  return {
    id: String(row.id),
    userId: String(
      row.user_id,
    ),
    tokenHash: String(
      row.token_hash,
    ),
    expiresAt: iso(
      row.expires_at,
    ),
    usedAt:
      nullableIso(
        row.used_at,
      ),
    createdAt: iso(
      row.created_at,
    ),
  };
}

function mapResetToken(
  row: Record<string, unknown>,
): PasswordResetToken {
  return {
    id: String(row.id),
    userId: String(
      row.user_id,
    ),
    tokenHash: String(
      row.token_hash,
    ),
    expiresAt: iso(
      row.expires_at,
    ),
    usedAt:
      nullableIso(
        row.used_at,
      ),
    createdAt: iso(
      row.created_at,
    ),
  };
}

export class DatabaseIdentityRepository
  implements IdentityRepository
{
  async findUnifiedUserById(
    id: string,
  ): Promise<UnifiedUser | null> {
    const result =
      await pgPool.query(
        `
        SELECT *
        FROM unified_users
        WHERE id = $1
           OR user_id = $1
        LIMIT 1
        `,
        [id],
      );

    return result.rows[0]
      ? mapUnifiedUser(
          result.rows[0],
        )
      : null;
  }

  async findUnifiedUserByEmail(
    email: string,
  ): Promise<UnifiedUser | null> {
    const result =
      await pgPool.query(
        `
        SELECT u.*
        FROM unified_users u
        JOIN login_identities l
          ON l.user_id = u.user_id
        WHERE LOWER(l.email)
          = LOWER($1)
        LIMIT 1
        `,
        [email],
      );

    return result.rows[0]
      ? mapUnifiedUser(
          result.rows[0],
        )
      : null;
  }

  async findUnifiedUserByUsername(
    username: string,
  ): Promise<UnifiedUser | null> {
    const result =
      await pgPool.query(
        `
        SELECT u.*
        FROM unified_users u
        JOIN login_identities l
          ON l.user_id = u.user_id
        WHERE LOWER(l.username)
          = LOWER($1)
        LIMIT 1
        `,
        [username],
      );

    return result.rows[0]
      ? mapUnifiedUser(
          result.rows[0],
        )
      : null;
  }

  async createUnifiedUser(
    user: Omit<
      UnifiedUser,
      "createdAt" |
        "updatedAt"
    >,
  ): Promise<UnifiedUser> {
    const now =
      new Date().toISOString();

    const result =
      await pgPool.query(
        `
        INSERT INTO unified_users (
          id,
          user_id,
          status,
          email_verified_at,
          last_login_at,
          display_name,
          username,
          email,
          birth_date,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,$11
        )
        ON CONFLICT (id)
        DO UPDATE SET
          user_id =
            EXCLUDED.user_id,
          status =
            EXCLUDED.status,
          email_verified_at =
            EXCLUDED.email_verified_at,
          last_login_at =
            EXCLUDED.last_login_at,
          display_name =
            EXCLUDED.display_name,
          username =
            EXCLUDED.username,
          email =
            EXCLUDED.email,
          birth_date =
            EXCLUDED.birth_date,
          updated_at =
            EXCLUDED.updated_at
        RETURNING *
        `,
        [
          user.id,
          user.userId,
          user.status,
          user.emailVerifiedAt ??
            null,
          user.lastLoginAt ??
            null,
          user.displayName ??
            null,
          user.username ??
            null,
          user.email ??
            null,
          user.birthDate ??
            null,
          now,
          now,
        ],
      );

    return mapUnifiedUser(
      result.rows[0],
    );
  }

  async updateUnifiedUser(
    id: string,
    updates: Partial<UnifiedUser>,
  ): Promise<UnifiedUser | null> {
    const current =
      await this.findUnifiedUserById(
        id,
      );

    if (!current) {
      return null;
    }

    const next = {
      ...current,
      ...updates,
      updatedAt:
        new Date().toISOString(),
    };

    const result =
      await pgPool.query(
        `
        UPDATE unified_users
        SET
          status = $2,
          email_verified_at = $3,
          last_login_at = $4,
          display_name = $5,
          username = $6,
          email = $7,
          birth_date = $8,
          updated_at = $9
        WHERE id = $1
           OR user_id = $1
        RETURNING *
        `,
        [
          id,
          next.status,
          next.emailVerifiedAt ??
            null,
          next.lastLoginAt ??
            null,
          next.displayName ??
            null,
          next.username ??
            null,
          next.email ??
            null,
          nullableDateOnly(
            next.birthDate,
          ),
          next.updatedAt,
        ],
      );

    return result.rows[0]
      ? mapUnifiedUser(
          result.rows[0],
        )
      : null;
  }

  async findLoginIdentityByUsername(
    username: string,
  ): Promise<LoginIdentity | null> {
    const result =
      await pgPool.query(
        `
        SELECT *
        FROM login_identities
        WHERE LOWER(username)
          = LOWER($1)
        LIMIT 1
        `,
        [username],
      );

    return result.rows[0]
      ? mapLoginIdentity(
          result.rows[0],
        )
      : null;
  }

  async findLoginIdentityByEmail(
    email: string,
  ): Promise<LoginIdentity | null> {
    const result =
      await pgPool.query(
        `
        SELECT *
        FROM login_identities
        WHERE LOWER(email)
          = LOWER($1)
        LIMIT 1
        `,
        [email],
      );

    return result.rows[0]
      ? mapLoginIdentity(
          result.rows[0],
        )
      : null;
  }

  async findLoginIdentityByUserId(
    userId: string,
    provider?: string,
  ): Promise<LoginIdentity | null> {
    const result = provider
      ? await pgPool.query(
          `
          SELECT *
          FROM login_identities
          WHERE user_id = $1
            AND provider = $2
          LIMIT 1
          `,
          [
            userId,
            provider,
          ],
        )
      : await pgPool.query(
          `
          SELECT *
          FROM login_identities
          WHERE user_id = $1
          LIMIT 1
          `,
          [userId],
        );

    return result.rows[0]
      ? mapLoginIdentity(
          result.rows[0],
        )
      : null;
  }

  async findLoginIdentitiesByUserId(
    userId: string,
  ): Promise<LoginIdentity[]> {
    const result =
      await pgPool.query(
        `
        SELECT *
        FROM login_identities
        WHERE user_id = $1
        ORDER BY created_at ASC
        `,
        [userId],
      );

    return result.rows.map(
      mapLoginIdentity,
    );
  }

  async createLoginIdentity(
    identity: Omit<
      LoginIdentity,
      "createdAt" |
        "updatedAt"
    >,
  ): Promise<LoginIdentity> {
    const now =
      new Date().toISOString();

    const id =
      identity.id ||
      identity.identityId;

    const identityId =
      identity.identityId ||
      identity.id;

    const result =
      await pgPool.query(
        `
        INSERT INTO login_identities (
          id,
          identity_id,
          user_id,
          provider,
          provider_user_id,
          login_identifier,
          verified,
          username,
          email,
          password_hash,
          email_verified_at,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          $11,$12,$13
        )
        ON CONFLICT (id)
        DO UPDATE SET
          identity_id =
            EXCLUDED.identity_id,
          user_id =
            EXCLUDED.user_id,
          provider =
            EXCLUDED.provider,
          provider_user_id =
            EXCLUDED.provider_user_id,
          login_identifier =
            EXCLUDED.login_identifier,
          verified =
            EXCLUDED.verified,
          username =
            EXCLUDED.username,
          email =
            EXCLUDED.email,
          password_hash =
            EXCLUDED.password_hash,
          email_verified_at =
            EXCLUDED.email_verified_at,
          updated_at =
            EXCLUDED.updated_at
        RETURNING *
        `,
        [
          id,
          identityId,
          identity.userId,
          identity.provider,
          identity.providerUserId ??
            null,
          identity.loginIdentifier,
          identity.verified,
          identity.username ??
            null,
          identity.email ??
            null,
          identity.passwordHash ??
            null,
          identity.emailVerifiedAt ??
            null,
          now,
          now,
        ],
      );

    return mapLoginIdentity(
      result.rows[0],
    );
  }

  async findClientByCode(
    code: string,
  ): Promise<Client | null> {
    const result =
      await pgPool.query(
        `
        SELECT *
        FROM auth_clients
        WHERE code = $1
        LIMIT 1
        `,
        [code],
      );

    return result.rows[0]
      ? mapClient(
          result.rows[0],
        )
      : null;
  }

  async createServiceAccess(
    access: Omit<
      ServiceAccess,
      "createdAt" |
        "updatedAt"
    >,
  ): Promise<ServiceAccess> {
    const now =
      new Date().toISOString();

    const result =
      await pgPool.query(
        `
        INSERT INTO service_access (
          id,
          user_id,
          service,
          client_id,
          status,
          joined_at,
          last_access_at,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9
        )
        ON CONFLICT (id)
        DO UPDATE SET
          user_id =
            EXCLUDED.user_id,
          service =
            EXCLUDED.service,
          client_id =
            EXCLUDED.client_id,
          status =
            EXCLUDED.status,
          joined_at =
            EXCLUDED.joined_at,
          last_access_at =
            EXCLUDED.last_access_at,
          updated_at =
            EXCLUDED.updated_at
        RETURNING *
        `,
        [
          access.id,
          access.userId,
          access.service,
          access.clientId,
          access.status,
          access.joinedAt ??
            null,
          access.lastAccessAt ??
            null,
          now,
          now,
        ],
      );

    return mapServiceAccess(
      result.rows[0],
    );
  }

  async findServiceAccess(
    userId: string,
    clientId: string,
  ): Promise<ServiceAccess | null> {
    const result =
      await pgPool.query(
        `
        SELECT *
        FROM service_access
        WHERE user_id = $1
          AND client_id = $2
        LIMIT 1
        `,
        [
          userId,
          clientId,
        ],
      );

    return result.rows[0]
      ? mapServiceAccess(
          result.rows[0],
        )
      : null;
  }

  async updateServiceAccess(
    userId: string,
    clientId: string,
    updates: Partial<ServiceAccess>,
  ): Promise<ServiceAccess | null> {
    const current =
      await this.findServiceAccess(
        userId,
        clientId,
      );

    if (!current) {
      return null;
    }

    const next = {
      ...current,
      ...updates,
      userId,
      clientId,
      updatedAt:
        new Date().toISOString(),
    };

    const result =
      await pgPool.query(
        `
        UPDATE service_access
        SET
          service = $3,
          status = $4,
          joined_at = $5,
          last_access_at = $6,
          updated_at = $7
        WHERE user_id = $1
          AND client_id = $2
        RETURNING *
        `,
        [
          userId,
          clientId,
          next.service,
          next.status,
          next.joinedAt ?? null,
          next.lastAccessAt ?? null,
          next.updatedAt,
        ],
      );

    return result.rows[0]
      ? mapServiceAccess(
          result.rows[0],
        )
      : null;
  }

  async findServiceAccessByUserId(
    userId: string,
    service?: string,
  ): Promise<ServiceAccess | null> {
    const result = service
      ? await pgPool.query(
          `
          SELECT *
          FROM service_access
          WHERE user_id = $1
            AND service = $2
          LIMIT 1
          `,
          [
            userId,
            service,
          ],
        )
      : await pgPool.query(
          `
          SELECT *
          FROM service_access
          WHERE user_id = $1
          LIMIT 1
          `,
          [userId],
        );

    return result.rows[0]
      ? mapServiceAccess(
          result.rows[0],
        )
      : null;
  }

  async createConsent(
    consent: Omit<
      Consent,
      "createdAt" |
        "updatedAt"
    >,
  ): Promise<Consent> {
    const now =
      new Date().toISOString();

    const result =
      await pgPool.query(
        `
        INSERT INTO consents (
          id,
          user_id,
          client_id,
          consent_type,
          version,
          status,
          granted_at,
          revoked_at,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10
        )
        ON CONFLICT (id)
        DO UPDATE SET
          user_id =
            EXCLUDED.user_id,
          client_id =
            EXCLUDED.client_id,
          consent_type =
            EXCLUDED.consent_type,
          version =
            EXCLUDED.version,
          status =
            EXCLUDED.status,
          granted_at =
            EXCLUDED.granted_at,
          revoked_at =
            EXCLUDED.revoked_at,
          updated_at =
            EXCLUDED.updated_at
        RETURNING *
        `,
        [
          consent.id,
          consent.userId,
          consent.clientId,
          consent.consentType,
          consent.version,
          consent.status,
          consent.grantedAt ??
            null,
          consent.revokedAt ??
            null,
          now,
          now,
        ],
      );

    return mapConsent(
      result.rows[0],
    );
  }

  async findConsent(
    userId: string,
    clientId: string,
    consentType: string,
  ): Promise<Consent | null> {
    const result =
      await pgPool.query(
        `
        SELECT *
        FROM consents
        WHERE user_id = $1
          AND client_id = $2
          AND consent_type = $3
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [
          userId,
          clientId,
          consentType,
        ],
      );

    return result.rows[0]
      ? mapConsent(
          result.rows[0],
        )
      : null;
  }

  async createEmailVerificationToken(
    token: Omit<
      EmailVerificationToken,
      "createdAt"
    >,
  ): Promise<EmailVerificationToken> {
    const now =
      new Date().toISOString();

    const result =
      await pgPool.query(
        `
        INSERT INTO email_verification_tokens (
          id,
          user_id,
          token_hash,
          expires_at,
          used_at,
          created_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6
        )
        ON CONFLICT (id)
        DO UPDATE SET
          user_id =
            EXCLUDED.user_id,
          token_hash =
            EXCLUDED.token_hash,
          expires_at =
            EXCLUDED.expires_at,
          used_at =
            EXCLUDED.used_at
        RETURNING *
        `,
        [
          token.id,
          token.userId,
          token.tokenHash,
          token.expiresAt,
          token.usedAt ??
            null,
          now,
        ],
      );

    return mapEmailToken(
      result.rows[0],
    );
  }

  async findEmailVerificationToken(
    userId: string,
  ): Promise<EmailVerificationToken | null> {
    const result =
      await pgPool.query(
        `
        SELECT *
        FROM email_verification_tokens
        WHERE user_id = $1
          AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [userId],
      );

    return result.rows[0]
      ? mapEmailToken(
          result.rows[0],
        )
      : null;
  }

  async markEmailVerificationTokenAsUsed(
    tokenId: string,
  ): Promise<void> {
    await pgPool.query(
      `
      UPDATE email_verification_tokens
      SET used_at = NOW()
      WHERE id = $1
      `,
      [tokenId],
    );
  }

  async createPasswordResetToken(
    token: Omit<
      PasswordResetToken,
      "createdAt"
    >,
  ): Promise<PasswordResetToken> {
    const now =
      new Date().toISOString();

    const result =
      await pgPool.query(
        `
        INSERT INTO password_reset_tokens (
          id,
          user_id,
          token_hash,
          expires_at,
          used_at,
          created_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6
        )
        ON CONFLICT (id)
        DO UPDATE SET
          user_id =
            EXCLUDED.user_id,
          token_hash =
            EXCLUDED.token_hash,
          expires_at =
            EXCLUDED.expires_at,
          used_at =
            EXCLUDED.used_at
        RETURNING *
        `,
        [
          token.id,
          token.userId,
          token.tokenHash,
          token.expiresAt,
          token.usedAt ??
            null,
          now,
        ],
      );

    return mapResetToken(
      result.rows[0],
    );
  }

  async findPasswordResetToken(
    userId: string,
  ): Promise<PasswordResetToken | null> {
    const result =
      await pgPool.query(
        `
        SELECT *
        FROM password_reset_tokens
        WHERE user_id = $1
          AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [userId],
      );

    return result.rows[0]
      ? mapResetToken(
          result.rows[0],
        )
      : null;
  }

  async markPasswordResetTokenAsUsed(
    tokenId: string,
  ): Promise<void> {
    await pgPool.query(
      `
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE id = $1
      `,
      [tokenId],
    );
  }
}

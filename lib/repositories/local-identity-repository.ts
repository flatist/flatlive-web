import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

import type {
  Client,
  Consent,
  LoginIdentity,
  ServiceAccess,
  UnifiedUser,
} from "@/lib/auth/identity-types";
import type { IdentityRepository } from "@/lib/repositories/identity-repository";
import type {
  EmailVerificationToken,
  PasswordResetToken,
} from "@/lib/auth/token-types";

const ROOT_PATH = path.join(process.cwd(), "data");
const USERS_PATH = path.join(ROOT_PATH, "identity-users.json");
const IDENTITIES_PATH = path.join(ROOT_PATH, "login-identities.json");
const CLIENTS_PATH = path.join(ROOT_PATH, "clients.json");
const SERVICE_ACCESS_PATH = path.join(ROOT_PATH, "service-access.json");
const CONSENTS_PATH = path.join(ROOT_PATH, "consents.json");
const EMAIL_VERIFICATION_TOKENS_PATH = path.join(ROOT_PATH, "email-verification-tokens.json");
const PASSWORD_RESET_TOKENS_PATH = path.join(ROOT_PATH, "password-reset-tokens.json");

function ensureFile(filePath: string, defaultValue: unknown) {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
  }
}

function readJson<T>(filePath: string, fallback: T): T {
  ensureFile(filePath, fallback);

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(content) as T;
    return parsed ?? fallback;
  } catch {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

function writeJson<T>(filePath: string, value: T) {
  ensureFile(filePath, value);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

export class LocalIdentityRepository implements IdentityRepository {
  async findUnifiedUserById(id: string): Promise<UnifiedUser | null> {
    const users = readJson<UnifiedUser[]>(USERS_PATH, []);
    return users.find((user) => user.id === id || user.userId === id) ?? null;
  }

  async findUnifiedUserByEmail(email: string): Promise<UnifiedUser | null> {
    const identities = readJson<LoginIdentity[]>(IDENTITIES_PATH, []);
    const identity = identities.find((item) => item.email?.toLowerCase() === email.toLowerCase());

    if (!identity) {
      return null;
    }

    return this.findUnifiedUserById(identity.userId);
  }

  async findUnifiedUserByUsername(username: string): Promise<UnifiedUser | null> {
    const identities = readJson<LoginIdentity[]>(IDENTITIES_PATH, []);
    const identity = identities.find((item) => item.username?.toLowerCase() === username.toLowerCase());

    if (!identity) {
      return null;
    }

    return this.findUnifiedUserById(identity.userId);
  }

  async createUnifiedUser(user: Omit<UnifiedUser, "createdAt" | "updatedAt">): Promise<UnifiedUser> {
    const users = readJson<UnifiedUser[]>(USERS_PATH, []);
    const now = new Date().toISOString();
    const nextUser: UnifiedUser = {
      ...user,
      id: user.id || user.userId,
      userId: user.userId || user.id,
      createdAt: now,
      updatedAt: now,
    };

    users.push(nextUser);
    writeJson(USERS_PATH, users);
    return nextUser;
  }

  async updateUnifiedUser(id: string, updates: Partial<UnifiedUser>): Promise<UnifiedUser | null> {
    const users = readJson<UnifiedUser[]>(USERS_PATH, []);
    const index = users.findIndex((user) => user.id === id || user.userId === id);

    if (index === -1) {
      return null;
    }

    const current = users[index];
    const updated: UnifiedUser = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    users[index] = updated;
    writeJson(USERS_PATH, users);
    return updated;
  }

  async findLoginIdentityByUsername(username: string): Promise<LoginIdentity | null> {
    const identities = readJson<LoginIdentity[]>(IDENTITIES_PATH, []);
    return identities.find((item) => item.username?.toLowerCase() === username.toLowerCase()) ?? null;
  }

  async findLoginIdentityByEmail(email: string): Promise<LoginIdentity | null> {
    const identities = readJson<LoginIdentity[]>(IDENTITIES_PATH, []);
    return identities.find((item) => item.email?.toLowerCase() === email.toLowerCase()) ?? null;
  }

  async findLoginIdentityByUserId(userId: string, provider?: string): Promise<LoginIdentity | null> {
    const identities = readJson<LoginIdentity[]>(IDENTITIES_PATH, []);
    return (
      identities.find(
        (item) => item.userId === userId && (!provider || item.provider === provider),
      ) ?? null
    );
  }

  async findLoginIdentitiesByUserId(userId: string): Promise<LoginIdentity[]> {
    const identities = readJson<LoginIdentity[]>(IDENTITIES_PATH, []);
    return identities.filter((item) => item.userId === userId);
  }

  async createLoginIdentity(identity: Omit<LoginIdentity, "createdAt" | "updatedAt">): Promise<LoginIdentity> {
    const identities = readJson<LoginIdentity[]>(IDENTITIES_PATH, []);
    const now = new Date().toISOString();
    const nextIdentity: LoginIdentity = {
      ...identity,
      id: identity.id || identity.identityId,
      identityId: identity.identityId || identity.id,
      createdAt: now,
      updatedAt: now,
    };

    identities.push(nextIdentity);
    writeJson(IDENTITIES_PATH, identities);
    return nextIdentity;
  }

  async findClientByCode(code: string): Promise<Client | null> {
    const clients = readJson<Client[]>(CLIENTS_PATH, []);
    return clients.find((client) => client.code === code) ?? null;
  }

  async createServiceAccess(access: Omit<ServiceAccess, "createdAt" | "updatedAt">): Promise<ServiceAccess> {
    const items = readJson<ServiceAccess[]>(SERVICE_ACCESS_PATH, []);
    const now = new Date().toISOString();
    const nextAccess: ServiceAccess = {
      ...access,
      service: access.service,
      createdAt: now,
      updatedAt: now,
    };

    items.push(nextAccess);
    writeJson(SERVICE_ACCESS_PATH, items);
    return nextAccess;
  }

  async findServiceAccess(userId: string, clientId: string): Promise<ServiceAccess | null> {
    const items = readJson<ServiceAccess[]>(SERVICE_ACCESS_PATH, []);
    return items.find((item) => item.userId === userId && item.clientId === clientId) ?? null;
  }

  async updateServiceAccess(
    userId: string,
    clientId: string,
    updates: Partial<ServiceAccess>,
  ): Promise<ServiceAccess | null> {
    const items = readJson<ServiceAccess[]>(SERVICE_ACCESS_PATH, []);

    const index = items.findIndex(
      (item) =>
        item.userId === userId &&
        item.clientId === clientId,
    );

    if (index === -1) {
      return null;
    }

    const updated: ServiceAccess = {
      ...items[index],
      ...updates,
      userId,
      clientId,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    writeJson(SERVICE_ACCESS_PATH, items);

    return updated;
  }

  async findServiceAccessByUserId(userId: string, service?: string): Promise<ServiceAccess | null> {
    const items = readJson<ServiceAccess[]>(SERVICE_ACCESS_PATH, []);
    return (
      items.find(
        (item) => item.userId === userId && (!service || item.service === service),
      ) ?? null
    );
  }

  async createConsent(consent: Omit<Consent, "createdAt" | "updatedAt">): Promise<Consent> {
    const items = readJson<Consent[]>(CONSENTS_PATH, []);
    const now = new Date().toISOString();
    const nextConsent: Consent = {
      ...consent,
      createdAt: now,
      updatedAt: now,
    };

    items.push(nextConsent);
    writeJson(CONSENTS_PATH, items);
    return nextConsent;
  }

  async findConsent(userId: string, clientId: string, consentType: string): Promise<Consent | null> {
    const items = readJson<Consent[]>(CONSENTS_PATH, []);
    return (
      items.find(
        (item) => item.userId === userId && item.clientId === clientId && item.consentType === consentType,
      ) ?? null
    );
  }

  // 이메일 인증 토큰 관리
  async createEmailVerificationToken(
    token: Omit<EmailVerificationToken, "createdAt">,
  ): Promise<EmailVerificationToken> {
    const tokens = readJson<EmailVerificationToken[]>(EMAIL_VERIFICATION_TOKENS_PATH, []);
    const now = new Date().toISOString();
    const nextToken: EmailVerificationToken = {
      ...token,
      createdAt: now,
    };

    tokens.push(nextToken);
    writeJson(EMAIL_VERIFICATION_TOKENS_PATH, tokens);
    return nextToken;
  }

  async findEmailVerificationToken(userId: string): Promise<EmailVerificationToken | null> {
    const tokens = readJson<EmailVerificationToken[]>(EMAIL_VERIFICATION_TOKENS_PATH, []);
    // 가장 최근 토큰 반환 (미사용 토큰)
    return (
      tokens
        .filter((token) => token.userId === userId && !token.usedAt)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .at(0) ?? null
    );
  }

  async markEmailVerificationTokenAsUsed(tokenId: string): Promise<void> {
    const tokens = readJson<EmailVerificationToken[]>(EMAIL_VERIFICATION_TOKENS_PATH, []);
    const index = tokens.findIndex((token) => token.id === tokenId);

    if (index !== -1) {
      tokens[index].usedAt = new Date().toISOString();
      writeJson(EMAIL_VERIFICATION_TOKENS_PATH, tokens);
    }
  }

  // 비밀번호 재설정 토큰 관리
  async createPasswordResetToken(
    token: Omit<PasswordResetToken, "createdAt">,
  ): Promise<PasswordResetToken> {
    const tokens = readJson<PasswordResetToken[]>(PASSWORD_RESET_TOKENS_PATH, []);
    const now = new Date().toISOString();
    const nextToken: PasswordResetToken = {
      ...token,
      createdAt: now,
    };

    tokens.push(nextToken);
    writeJson(PASSWORD_RESET_TOKENS_PATH, tokens);
    return nextToken;
  }

  async findPasswordResetToken(userId: string): Promise<PasswordResetToken | null> {
    const tokens = readJson<PasswordResetToken[]>(PASSWORD_RESET_TOKENS_PATH, []);
    // 가장 최근 토큰 반환 (미사용 토큰)
    return (
      tokens
        .filter((token) => token.userId === userId && !token.usedAt)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .at(0) ?? null
    );
  }

  async markPasswordResetTokenAsUsed(tokenId: string): Promise<void> {
    const tokens = readJson<PasswordResetToken[]>(PASSWORD_RESET_TOKENS_PATH, []);
    const index = tokens.findIndex((token) => token.id === tokenId);

    if (index !== -1) {
      tokens[index].usedAt = new Date().toISOString();
      writeJson(PASSWORD_RESET_TOKENS_PATH, tokens);
    }
  }
}

export function createUnifiedUserId() {
  return `usr_${randomUUID()}`;
}

export function createLoginIdentityId() {
  return `li_${randomUUID()}`;
}

export function createServiceAccessId() {
  return `sa_${randomUUID()}`;
}

export function createConsentId() {
  return `cs_${randomUUID()}`;
}

export function ensureDefaultClients() {
  const clients = readJson<Client[]>(CLIENTS_PATH, []);

  const defaults = [
    { id: "cl_flatlive", code: "FLATLIVE", name: "FlatLive", status: "ACTIVE" },
    { id: "cl_gogorealbox", code: "GOGOREALBOX", name: "고고리얼박스", status: "ACTIVE" },
    { id: "cl_sia_angel", code: "SIA_ANGEL", name: "SIA Angel", status: "ACTIVE" },
  ] as const;

  const nextClients = [...clients];

  for (const client of defaults) {
    const exists = nextClients.some((item) => item.code === client.code);
    if (!exists) {
      nextClients.push({
        ...client,
        createdAt: new Date().toISOString(),
      });
    }
  }

  writeJson(CLIENTS_PATH, nextClients);
}

ensureDefaultClients();

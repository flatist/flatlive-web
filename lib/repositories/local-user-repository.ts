import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

import type { UserId, UserRecord } from "@/lib/auth/types";
import type { UserRepository } from "@/lib/repositories/user-repository";

const STORE_PATH = path.join(process.cwd(), "data", "users.json");

function ensureStoreFile() {
  const directory = path.dirname(STORE_PATH);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify([], null, 2), "utf8");
  }
}

function normalizeUserRecord(raw: unknown): UserRecord | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const user = raw as Partial<UserRecord>;
  const id = typeof user.id === "string" ? user.id : "";
  const email = typeof user.email === "string" ? user.email.trim() : "";
  const passwordHash = typeof user.passwordHash === "string" ? user.passwordHash : "";
  const username = typeof user.username === "string" ? user.username.trim() : email.split("@")[0] || "user";
  const displayName =
    typeof user.displayName === "string" && user.displayName.trim()
      ? user.displayName.trim()
      : username;

  if (!id || !email || !passwordHash) {
    return null;
  }

  return {
    id,
    username,
    email,
    displayName,
    passwordHash,
    createdAt: typeof user.createdAt === "string" ? user.createdAt : new Date().toISOString(),
    updatedAt: typeof user.updatedAt === "string" ? user.updatedAt : new Date().toISOString(),
  };
}

function readUsers(): UserRecord[] {
  ensureStoreFile();

  try {
    const content = fs.readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as unknown;

    if (!Array.isArray(parsed)) {
      writeUsers([]);
      return [];
    }

    const normalized = parsed
      .map(normalizeUserRecord)
      .filter((user): user is UserRecord => user !== null);

    const deduplicated = normalized.filter(
      (user, index, array) => array.findIndex((candidate) => candidate.id === user.id) === index,
    );

    if (deduplicated.length !== normalized.length) {
      writeUsers(deduplicated);
    }

    return deduplicated;
  } catch {
    fs.writeFileSync(STORE_PATH, JSON.stringify([], null, 2), "utf8");
    return [];
  }
}

function writeUsers(users: UserRecord[]) {
  ensureStoreFile();
  fs.writeFileSync(STORE_PATH, JSON.stringify(users, null, 2), "utf8");
}

export class LocalUserRepository implements UserRepository {
  async findAll() {
    return readUsers();
  }

  async findById(id: UserId) {
    const users = readUsers();
    return users.find((user) => user.id === id) ?? null;
  }

  async findByUsername(username: string) {
    const users = readUsers();
    return users.find((user) => user.username.toLowerCase() === username.toLowerCase()) ?? null;
  }

  async findByEmail(email: string) {
    const users = readUsers();
    return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  async create(user: Omit<UserRecord, "createdAt" | "updatedAt">) {
    const users = readUsers();
    const now = new Date().toISOString();

    const nextUser: UserRecord = {
      ...user,
      createdAt: now,
      updatedAt: now,
    };

    users.push(nextUser);
    writeUsers(users);

    return nextUser;
  }

  async update(id: UserId, updates: Partial<Omit<UserRecord, "id" | "createdAt">>) {
    const users = readUsers();
    const index = users.findIndex((user) => user.id === id);

    if (index === -1) {
      return null;
    }

    const current = users[index];
    const updated: UserRecord = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    users[index] = updated;
    writeUsers(users);

    return updated;
  }

  async delete(id: UserId) {
    const users = readUsers();
    const nextUsers = users.filter((user) => user.id !== id);
    writeUsers(nextUsers);
  }
}

export function createUserId() {
  return randomUUID();
}

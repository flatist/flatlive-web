import { promises as fs } from "fs";
import path from "path";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export const AGENCY_SCOPE_TYPES = ["HEAD", "BRANCH", "AGENCY"] as const;
export type AgencyScopeType = (typeof AGENCY_SCOPE_TYPES)[number];

export type AgencyAccessCodeRecord = {
  accessId: string;
  scopeType: AgencyScopeType;
  scopeId: string;
  label: string;
  salt: string;
  codeHash: string;
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  updatedAt: string;
};

export type AgencyAccessCodeSummary = Omit<AgencyAccessCodeRecord, "salt" | "codeHash"> & {
  hasCode: true;
};

const FILE_PATH = path.join(process.cwd(), "data", "agency-access-codes.json");
let writeQueue: Promise<void> = Promise.resolve();

async function readRecords(): Promise<AgencyAccessCodeRecord[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "ENOENT") return [];
    throw error;
  }
}

async function writeRecords(records: AgencyAccessCodeRecord[]) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  const temp = `${FILE_PATH}.tmp`;
  await fs.writeFile(temp, JSON.stringify(records, null, 2) + "\n", "utf8");
  await fs.rename(temp, FILE_PATH);
}

function hashCode(code: string, salt: string) {
  return scryptSync(code, salt, 32).toString("hex");
}

function safeEqualHex(left: string, right: string) {
  try {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function validateAgencyAccessCode(code: string) {
  const normalized = code.trim();
  if (normalized.length < 6 || normalized.length > 64) {
    throw new Error("접속코드는 6자 이상 64자 이하로 입력해주세요.");
  }
  return normalized;
}

export async function listAgencyAccessCodes(): Promise<AgencyAccessCodeSummary[]> {
  const records = await readRecords();
  return records.map(({ salt: _salt, codeHash: _codeHash, ...record }) => ({ ...record, hasCode: true as const }));
}

export async function setAgencyAccessCode(input: {
  scopeType: AgencyScopeType;
  scopeId: string;
  label: string;
  code: string;
}) {
  const code = validateAgencyAccessCode(input.code);
  const scopeId = input.scopeId.trim();
  const label = input.label.trim() || scopeId;
  if (!scopeId) throw new Error("조직 ID가 필요합니다.");

  return withWriteLock(async () => {
    const records = await readRecords();
    const accessId = `${input.scopeType}:${scopeId}`;
    const now = new Date().toISOString();
    const existingIndex = records.findIndex((item) => item.accessId === accessId);
    const salt = randomBytes(16).toString("hex");
    const record: AgencyAccessCodeRecord = {
      accessId,
      scopeType: input.scopeType,
      scopeId,
      label,
      salt,
      codeHash: hashCode(code, salt),
      status: "ACTIVE",
      createdAt: existingIndex >= 0 ? records[existingIndex].createdAt : now,
      updatedAt: now,
    };
    if (existingIndex >= 0) records[existingIndex] = record;
    else records.push(record);
    await writeRecords(records);
    const { salt: _salt, codeHash: _codeHash, ...summary } = record;
    return { ...summary, hasCode: true as const };
  });
}

export async function disableAgencyAccessCode(accessId: string) {
  return withWriteLock(async () => {
    const records = await readRecords();
    const index = records.findIndex((item) => item.accessId === accessId);
    if (index < 0) return null;
    records[index] = { ...records[index], status: "DISABLED", updatedAt: new Date().toISOString() };
    await writeRecords(records);
    const { salt: _salt, codeHash: _codeHash, ...summary } = records[index];
    return { ...summary, hasCode: true as const };
  });
}

export async function authenticateAgencyAccessCode(codeInput: string) {
  const code = validateAgencyAccessCode(codeInput);
  const records = await readRecords();
  for (const record of records) {
    if (record.status !== "ACTIVE") continue;
    const candidate = hashCode(code, record.salt);
    if (safeEqualHex(candidate, record.codeHash)) {
      return {
        accessId: record.accessId,
        scopeType: record.scopeType,
        scopeId: record.scopeId,
        label: record.label,
      };
    }
  }
  return null;
}

async function withWriteLock<T>(work: () => Promise<T>): Promise<T> {
  const operation = writeQueue.then(work);
  writeQueue = operation.then(() => undefined).catch(() => undefined);
  return operation;
}

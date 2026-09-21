import { promises as fs } from "fs";
import path from "path";

export type AgencyStatus = "ACTIVE" | "INACTIVE";

export type AgencyRecord = {
  agencyId: string;
  name: string;
  status: AgencyStatus;
  branchId?: string;
  headManagerUserId?: string;
  contact?: string;
  createdAt: string;
  updatedAt: string;
};

export type BranchRecord = {
  branchId: string;
  agencyId: string;
  name: string;
  status: AgencyStatus;
  headManagerUserId?: string;
  contact?: string;
  createdAt: string;
  updatedAt: string;
};

export type HeadManagerRecord = {
  headManagerUserId: string;
  agencyId: string;
  branchId?: string | null;
  name?: string;
  contact?: string;
  status: AgencyStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreatorAgencyAffiliation = {
  creatorUserId: string;
  agencyId: string;
  branchId: string;
  headManagerUserId: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
};

type AffiliationStoreData = {
  agencies: AgencyRecord[];
  branches: BranchRecord[];
  headManagers: HeadManagerRecord[];
  creators: CreatorAgencyAffiliation[];
};

export type CreatorSettlementAffiliation =
  | {
      affiliation: "AGENCY";
      creatorUserId: string;
      agencyId: string;
      branchId: string;
      headManagerUserId: string;
    }
  | {
      affiliation: "INDEPENDENT";
      creatorUserId: string;
    };

const FILE_PATH = path.join(process.cwd(), "data", "settlement-affiliations.json");

const EMPTY_DATA: AffiliationStoreData = {
  agencies: [],
  branches: [],
  headManagers: [],
  creators: [],
};

let writeQueue: Promise<void> = Promise.resolve();

async function readStore(): Promise<AffiliationStoreData> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      agencies: Array.isArray(parsed?.agencies) ? parsed.agencies : [],
      branches: Array.isArray(parsed?.branches) ? parsed.branches : [],
      headManagers: Array.isArray(parsed?.headManagers) ? parsed.headManagers : [],
      creators: Array.isArray(parsed?.creators) ? parsed.creators : [],
    };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "ENOENT") return { ...EMPTY_DATA };
    throw error;
  }
}

async function writeStore(data: AffiliationStoreData) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  const tempPath = `${FILE_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  await fs.rename(tempPath, FILE_PATH);
}

async function withWriteLock<T>(work: () => Promise<T>): Promise<T> {
  const operation = writeQueue.then(work);
  writeQueue = operation.then(() => undefined).catch(() => undefined);
  return operation;
}

function requiredText(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label}을(를) 입력해주세요.`);
  if (normalized.length > 100) throw new Error(`${label}은(는) 100자 이하로 입력해주세요.`);
  return normalized;
}

function optionalText(value?: string) {
  const normalized = (value || "").trim();
  return normalized.slice(0, 100);
}

export async function upsertHeadManager(input: {
  headManagerUserId: string;
  name: string;
  contact?: string;
  status?: AgencyStatus;
}) {
  return withWriteLock(async () => {
    const data = await readStore();
    const headManagerUserId = requiredText(input.headManagerUserId, "본부장 ID");
    const name = requiredText(input.name, "본부장명");
    const now = new Date().toISOString();
    const index = data.headManagers.findIndex((item) => item.headManagerUserId === headManagerUserId);
    const previous = index >= 0 ? data.headManagers[index] : null;
    const record: HeadManagerRecord = {
      headManagerUserId,
      name,
      contact: optionalText(input.contact),
      status: input.status || previous?.status || "ACTIVE",
      agencyId: previous?.agencyId || "",
      branchId: previous?.branchId ?? null,
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    };
    if (index >= 0) data.headManagers[index] = record;
    else data.headManagers.push(record);
    await writeStore(data);
    return record;
  });
}

export async function upsertBranch(input: {
  branchId: string;
  name: string;
  headManagerUserId: string;
  contact?: string;
  status?: AgencyStatus;
}) {
  return withWriteLock(async () => {
    const data = await readStore();
    const branchId = requiredText(input.branchId, "지사 ID");
    const name = requiredText(input.name, "지사명");
    const headManagerUserId = requiredText(input.headManagerUserId, "소속 본부장");
    const head = data.headManagers.find((item) => item.headManagerUserId === headManagerUserId);
    if (!head) throw new Error("등록된 본부장을 찾지 못했습니다.");
    const now = new Date().toISOString();
    const index = data.branches.findIndex((item) => item.branchId === branchId);
    const previous = index >= 0 ? data.branches[index] : null;
    const record: BranchRecord = {
      branchId,
      name,
      headManagerUserId,
      contact: optionalText(input.contact),
      status: input.status || previous?.status || "ACTIVE",
      agencyId: previous?.agencyId || "",
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    };
    if (index >= 0) data.branches[index] = record;
    else data.branches.push(record);
    await writeStore(data);
    return record;
  });
}

export async function upsertAgency(input: {
  agencyId: string;
  name: string;
  branchId: string;
  contact?: string;
  status?: AgencyStatus;
}) {
  return withWriteLock(async () => {
    const data = await readStore();
    const agencyId = requiredText(input.agencyId, "에이전시 ID");
    const name = requiredText(input.name, "에이전시명");
    const branchId = requiredText(input.branchId, "소속 지사");
    const branch = data.branches.find((item) => item.branchId === branchId);
    if (!branch) throw new Error("등록된 지사를 찾지 못했습니다.");
    const now = new Date().toISOString();
    const index = data.agencies.findIndex((item) => item.agencyId === agencyId);
    const previous = index >= 0 ? data.agencies[index] : null;
    const record: AgencyRecord = {
      agencyId,
      name,
      branchId,
      headManagerUserId: branch.headManagerUserId,
      contact: optionalText(input.contact),
      status: input.status || previous?.status || "ACTIVE",
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    };
    if (index >= 0) data.agencies[index] = record;
    else data.agencies.push(record);
    await writeStore(data);
    return record;
  });
}

export async function setOrganizationStatus(input: {
  scopeType: "HEAD" | "BRANCH" | "AGENCY";
  scopeId: string;
  status: AgencyStatus;
}) {
  return withWriteLock(async () => {
    const data = await readStore();
    const now = new Date().toISOString();
    if (input.scopeType === "HEAD") {
      const index = data.headManagers.findIndex((item) => item.headManagerUserId === input.scopeId);
      if (index < 0) throw new Error("본부장을 찾지 못했습니다.");
      data.headManagers[index] = { ...data.headManagers[index], status: input.status, updatedAt: now };
      await writeStore(data);
      return data.headManagers[index];
    }
    if (input.scopeType === "BRANCH") {
      const index = data.branches.findIndex((item) => item.branchId === input.scopeId);
      if (index < 0) throw new Error("지사를 찾지 못했습니다.");
      data.branches[index] = { ...data.branches[index], status: input.status, updatedAt: now };
      await writeStore(data);
      return data.branches[index];
    }
    const index = data.agencies.findIndex((item) => item.agencyId === input.scopeId);
    if (index < 0) throw new Error("에이전시를 찾지 못했습니다.");
    data.agencies[index] = { ...data.agencies[index], status: input.status, updatedAt: now };
    await writeStore(data);
    return data.agencies[index];
  });
}

export async function getCreatorSettlementAffiliation(creatorUserId: string): Promise<CreatorSettlementAffiliation> {
  const data = await readStore();
  const record = data.creators.find((item) => item.creatorUserId === creatorUserId);
  if (!record) return { affiliation: "INDEPENDENT", creatorUserId };
  return {
    affiliation: "AGENCY",
    creatorUserId: record.creatorUserId,
    agencyId: record.agencyId,
    branchId: record.branchId,
    headManagerUserId: record.headManagerUserId,
  };
}

export async function setCreatorAgencyAffiliation(input: {
  creatorUserId: string;
  agencyId: string;
  branchId: string;
  headManagerUserId: string;
}) {
  return withWriteLock(async () => {
    const data = await readStore();
    const now = new Date().toISOString();
    const index = data.creators.findIndex((item) => item.creatorUserId === input.creatorUserId);
    const record: CreatorAgencyAffiliation = {
      creatorUserId: input.creatorUserId,
      agencyId: input.agencyId,
      branchId: input.branchId,
      headManagerUserId: input.headManagerUserId,
      joinedAt: index >= 0 ? data.creators[index].joinedAt : now,
      createdAt: index >= 0 ? data.creators[index].createdAt : now,
      updatedAt: now,
    };
    if (index >= 0) data.creators[index] = record;
    else data.creators.push(record);
    await writeStore(data);
    return record;
  });
}

export async function removeCreatorAgencyAffiliation(creatorUserId: string) {
  return withWriteLock(async () => {
    const data = await readStore();
    const before = data.creators.length;
    data.creators = data.creators.filter((item) => item.creatorUserId !== creatorUserId);
    const removed = before !== data.creators.length;
    if (removed) await writeStore(data);
    return { creatorUserId, removed, affiliation: "INDEPENDENT" as const };
  });
}

export async function listAgencyCreators(agencyId: string) {
  const data = await readStore();
  return data.creators.filter((item) => item.agencyId === agencyId);
}

export async function listBranchCreators(branchId: string) {
  const data = await readStore();
  return data.creators.filter((item) => item.branchId === branchId);
}

export async function listHeadManagerCreators(headManagerUserId: string) {
  const data = await readStore();
  return data.creators.filter((item) => item.headManagerUserId === headManagerUserId);
}

export async function listAllSettlementAffiliations() {
  return readStore();
}

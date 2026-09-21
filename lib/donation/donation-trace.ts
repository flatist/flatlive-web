import { promises as fs } from "fs";
import path from "path";

export type DonationTraceEventType =
  | "DONATION_STARTED"
  | "SENDER_DEBITED"
  | "RECEIVER_CREDITED"
  | "COMPLETED"
  | "RECEIVER_FAILED"
  | "COMPENSATION_STARTED"
  | "COMPENSATION_COMPLETED"
  | "COMPENSATION_FAILED"
  | "FAILED"
  | "MANUAL_RECOVERY_STARTED"
  | "MANUAL_RECOVERY_COMPLETED"
  | "MANUAL_RECOVERY_FAILED";

export type DonationTraceEvent = {
  eventId: string;
  donationId: string;
  eventType: DonationTraceEventType;
  createdAt: string;

  senderUserId?: string;
  receiverUserId?: string;
  amount?: number;
  donationMode?: "single" | "repeat" | "sequence";

  transactionId?: string;
  errorMessage?: string;
};

const TRACE_FILE = path.join(
  process.cwd(),
  "data",
  "donation-events.json",
);

let writeQueue: Promise<void> = Promise.resolve();

async function readEvents(): Promise<DonationTraceEvent[]> {
  try {
    const raw = await fs.readFile(TRACE_FILE, "utf8");
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error
        ? String(error.code)
        : "";

    if (code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeEvents(events: DonationTraceEvent[]) {
  await fs.mkdir(path.dirname(TRACE_FILE), {
    recursive: true,
  });

  const temporaryFile = `${TRACE_FILE}.tmp`;

  await fs.writeFile(
    temporaryFile,
    JSON.stringify(events, null, 2),
    "utf8",
  );

  await fs.rename(temporaryFile, TRACE_FILE);
}

export async function appendDonationTrace(
  event: DonationTraceEvent,
) {
  const operation = writeQueue.then(async () => {
    const events = await readEvents();

    events.push(event);

    await writeEvents(events);
  });

  writeQueue = operation.catch(() => undefined);

  return operation;
}

export async function getDonationTrace(
  donationId: string,
) {
  const events = await readEvents();

  return events
    .filter((event) => event.donationId === donationId)
    .sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
}

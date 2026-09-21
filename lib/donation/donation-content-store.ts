import { promises as fs } from "fs";
import path from "path";

export type DonationContentLink = {
  donationId: string;

  contentType: "LIVE";
  contentId: string;

  contentTitle: string;
  category: string;

  senderUserId: string;
  receiverUserId: string;

  createdAt: string;
};

const FILE_PATH = path.join(
  process.cwd(),
  "data",
  "donation-content-links.json",
);

let writeQueue: Promise<void> =
  Promise.resolve();

async function readLinks(): Promise<
  DonationContentLink[]
> {
  try {
    const raw = await fs.readFile(
      FILE_PATH,
      "utf8",
    );

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
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

async function writeLinks(
  links: DonationContentLink[],
) {
  await fs.mkdir(
    path.dirname(FILE_PATH),
    {
      recursive: true,
    },
  );

  const temporaryFile =
    `${FILE_PATH}.tmp`;

  await fs.writeFile(
    temporaryFile,
    JSON.stringify(
      links,
      null,
      2,
    ),
    "utf8",
  );

  await fs.rename(
    temporaryFile,
    FILE_PATH,
  );
}

export async function appendDonationContentLink(
  link: DonationContentLink,
) {
  const operation =
    writeQueue.then(async () => {
      const links =
        await readLinks();

      if (
        links.some(
          (item) =>
            item.donationId ===
            link.donationId,
        )
      ) {
        return;
      }

      links.push(link);

      await writeLinks(links);
    });

  writeQueue =
    operation.catch(
      () => undefined,
    );

  return operation;
}

export async function getDonationContentLink(
  donationId: string,
) {
  const links =
    await readLinks();

  return (
    links.find(
      (item) =>
        item.donationId ===
        donationId,
    ) ?? null
  );
}

export async function listReceivedDonationContentLinks(
  receiverUserId: string,
) {
  const links =
    await readLinks();

  return links
    .filter(
      (item) =>
        item.receiverUserId ===
        receiverUserId,
    )
    .sort((a, b) =>
      b.createdAt.localeCompare(
        a.createdAt,
      ),
    );
}

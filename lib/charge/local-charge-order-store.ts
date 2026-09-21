import fs from "fs/promises";
import path from "path";

export type ChargePaymentMethod =
  | "card"
  | "easy"
  | "bank";

export type ChargeOrderStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED";

export type ChargeOrder = {
  orderId: string;
  traceId: string;
  userId: string;

  assetType: "FLAT";
  chargeAmount: number;

  feeRate: number;
  feeAmount: number;
  totalPaymentAmount: number;

  paymentMethod: ChargePaymentMethod;
  currency: "KRW";

  status: ChargeOrderStatus;

  createdAt: string;
  updatedAt: string;
};

const FILE_PATH = path.join(
  process.cwd(),
  "data",
  "charge-orders.json",
);

/**
 * 개발용 단일 Node 프로세스 안에서
 * 충전 주문 쓰기를 직렬화한다.
 *
 * 운영 환경에서는 DB transaction +
 * UNIQUE(orderId) 등으로 교체한다.
 */
let writeQueue: Promise<void> =
  Promise.resolve();

async function withWriteLock<T>(
  work: () => Promise<T>,
): Promise<T> {
  const previous = writeQueue;

  let release!: () => void;

  writeQueue = new Promise<void>(
    (resolve) => {
      release = resolve;
    },
  );

  await previous;

  try {
    return await work();
  } finally {
    release();
  }
}

async function readOrders():
  Promise<ChargeOrder[]> {
  try {
    const raw = await fs.readFile(
      FILE_PATH,
      "utf8",
    );

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? (parsed as ChargeOrder[])
      : [];
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException)
        .code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

async function writeOrders(
  orders: ChargeOrder[],
) {
  await fs.mkdir(
    path.dirname(FILE_PATH),
    {
      recursive: true,
    },
  );

  const tempPath =
    `${FILE_PATH}.tmp`;

  await fs.writeFile(
    tempPath,
    JSON.stringify(
      orders,
      null,
      2,
    ) + "\n",
    "utf8",
  );

  await fs.rename(
    tempPath,
    FILE_PATH,
  );
}

export async function createChargeOrder(
  order: ChargeOrder,
) {
  return withWriteLock(
    async () => {
      const orders =
        await readOrders();

      if (
        orders.some(
          (item) =>
            item.orderId ===
            order.orderId,
        )
      ) {
        throw new Error(
          "이미 존재하는 orderId입니다.",
        );
      }

      orders.push(order);

      await writeOrders(orders);

      return order;
    },
  );
}

export async function findChargeOrder(
  orderId: string,
) {
  const orders =
    await readOrders();

  return (
    orders.find(
      (item) =>
        item.orderId === orderId,
    ) ?? null
  );
}

export async function markChargeOrderPaid(
  orderId: string,
) {
  return withWriteLock(async () => {
    const orders =
      await readOrders();

    const index =
      orders.findIndex(
        (item) =>
          item.orderId === orderId,
      );

    if (index < 0) {
      throw new Error(
        "충전 주문을 찾을 수 없습니다.",
      );
    }

    const current =
      orders[index];

    if (
      current.status === "PAID"
    ) {
      return current;
    }

    if (
      current.status !== "PENDING"
    ) {
      throw new Error(
        `PENDING 주문만 결제완료 처리할 수 있습니다. 현재 상태: ${current.status}`,
      );
    }

    const updated: ChargeOrder = {
      ...current,
      status: "PAID",
      updatedAt:
        new Date().toISOString(),
    };

    orders[index] = updated;

    await writeOrders(orders);

    return updated;
  });
}

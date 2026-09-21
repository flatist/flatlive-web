import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  parseSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import { WalletService } from "@/lib/wallet/wallet-service";

import {
  listReceivedDonationContentLinks,
} from "@/lib/donation/donation-content-store";

import { HybridUserRepository } from "@/lib/repositories/hybrid-user-repository";

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    "ko-KR",
  ).format(value);
}

function formatDate(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

export default async function LiveRevenuePage() {
  const token =
    (await cookies()).get(
      SESSION_COOKIE_NAME,
    )?.value;

  const userId =
    token
      ? parseSessionToken(
          token,
        )?.userId ?? null
      : null;

  if (!userId) {
    redirect("/login");
  }

  const walletService =
    new WalletService();

  const userRepository =
    new HybridUserRepository();

  const [
    revenue,
    contentLinks,
  ] =
    await Promise.all([
      walletService
        .getReceivedDonationSummary(
          userId,
        ),

      listReceivedDonationContentLinks(
        userId,
      ),
    ]);

  const linkMap =
    new Map(
      contentLinks.map(
        (item) => [
          item.donationId,
          item,
        ],
      ),
    );

  const items =
    await Promise.all(
      revenue.recentLive.map(
        async (entry) => {
          const donationId =
            entry.sourceId ?? "";

          const link =
            donationId
              ? linkMap.get(
                  donationId,
                ) ?? null
              : null;

          const sender =
            link
              ? await userRepository
                  .findById(
                    link.senderUserId,
                  )
              : null;

          return {
            transactionId:
              entry.transactionId,

            donationId,

            amount:
              entry.amount,

            createdAt:
              link?.createdAt ??
              entry.createdAt,

            senderDisplayName:
              sender?.displayName ??
              "이전 후원 기록",

            senderUsername:
              sender?.username ??
              "",

            contentTitle:
              link?.contentTitle ??
              "방송 정보 없음",

            contentId:
              link?.contentId ??
              "",
          };
        },
      ),
    );

  return (
    <main
      className="
        mx-auto
        min-h-screen
        w-full
        max-w-3xl
        bg-white
        px-4
        pb-20
        pt-5
        text-black
      "
    >
      <div
        className="
          mb-6
          flex
          items-center
          gap-3
        "
      >
        <Link
          href="/profile/revenue"
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            border
            border-gray-200
            text-xl
          "
        >
          ‹
        </Link>

        <div>
          <h1
            className="
              text-xl
              font-bold
            "
          >
            LIVE 후원 내역
          </h1>

          <p
            className="
              mt-1
              text-sm
              text-gray-500
            "
          >
            내가 받은 LIVE 후원을 확인합니다.
          </p>
        </div>
      </div>

      <section
        className="
          mb-5
          rounded-2xl
          border
          border-gray-200
          p-5
        "
      >
        <div
          className="
            text-sm
            text-gray-500
          "
        >
          받은 LIVE 후원
        </div>

        <div
          className="
            mt-2
            text-2xl
            font-bold
          "
        >
          {formatNumber(
            revenue.liveReceived,
          )}{" "}
          FLAT
        </div>

        <div
          className="
            mt-1
            text-sm
            text-gray-500
          "
        >
          총{" "}
          {formatNumber(
            revenue.liveCount,
          )}
          건
        </div>
      </section>

      <section>
        {items.length === 0 ? (
          <div
            className="
              rounded-2xl
              border
              border-gray-200
              px-5
              py-12
              text-center
              text-sm
              text-gray-500
            "
          >
            받은 LIVE 후원 내역이 없습니다.
          </div>
        ) : (
          <div
            className="
              overflow-hidden
              rounded-2xl
              border
              border-gray-200
            "
          >
            {items.map(
              (
                item,
                index,
              ) => (
                <article
                  key={
                    item.transactionId
                  }
                  className={`
                    px-5
                    py-4
                    ${
                      index !==
                      items.length -
                        1
                        ? "border-b border-gray-100"
                        : ""
                    }
                  `}
                >
                  <div
                    className="
                      flex
                      items-start
                      justify-between
                      gap-4
                    "
                  >
                    <div
                      className="
                        min-w-0
                        flex-1
                      "
                    >
                      <div
                        className="
                          truncate
                          font-semibold
                        "
                      >
                        {
                          item.senderDisplayName
                        }
                      </div>

                      {item.senderUsername ? (
                        <div
                          className="
                            mt-0.5
                            text-sm
                            text-gray-500
                          "
                        >
                          @
                          {
                            item.senderUsername
                          }
                        </div>
                      ) : null}
                    </div>

                    <div
                      className="
                        shrink-0
                        text-right
                        font-bold
                      "
                    >
                      +
                      {formatNumber(
                        item.amount,
                      )}{" "}
                      FLAT
                    </div>
                  </div>

                  <div
                    className="
                      mt-3
                      text-sm
                      text-gray-600
                    "
                  >
                    방송:{" "}
                    {
                      item.contentTitle
                    }
                  </div>

                  <div
                    className="
                      mt-1
                      text-xs
                      text-gray-400
                    "
                  >
                    {formatDate(
                      item.createdAt,
                    )}
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </main>
  );
}

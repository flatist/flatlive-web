import fs from "fs/promises";
import path from "path";

import {
  NextRequest,
  NextResponse,
} from "next/server";

type DonationEffectType =
  | "single_video"
  | "continuous_image";

type DonationEffect = {
  id: string;
  name: string;
  amount: number;
  effectType: DonationEffectType;
  mediaType:
    | "image"
    | "video";
  mediaUrl: string;
  originalFileName: string;
  durationMs?: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const DATA_FILE = path.join(
  process.cwd(),
  "data",
  "donation-effects.json",
);

async function readEffects():
  Promise<DonationEffect[]> {
  try {
    const raw =
      await fs.readFile(
        DATA_FILE,
        "utf8",
      );

    const parsed =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(
      (item) => ({
        ...item,
        effectType:
          item.effectType ===
            "continuous_image"
            ? "continuous_image"
            : item.effectType ===
                "single_video"
              ? "single_video"
              : item.mediaType ===
                  "image"
                ? "continuous_image"
                : "single_video",
      }),
    );
  } catch (error) {
    const code =
      (
        error as NodeJS.ErrnoException
      ).code;

    if (code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function GET(
  request: NextRequest,
) {
  try {
    const amount =
      Number(
        request.nextUrl.searchParams.get(
          "amount",
        ),
      );

    const requestedType =
      request.nextUrl.searchParams.get(
        "effectType",
      );

    const effectType:
      DonationEffectType =
      requestedType ===
        "continuous_image"
        ? "continuous_image"
        : "single_video";

    if (
      !Number.isSafeInteger(amount) ||
      amount < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "올바른 후원금액이 필요합니다.",
        },
        {
          status: 400,
        },
      );
    }

    const effects =
      await readEffects();

    const exactEffect =
      effects.find(
        (item) =>
          item.enabled === true &&
          item.amount === amount &&
          item.effectType ===
            effectType,
      ) ?? null;

    const fallbackEffect =
      effectType ===
        "continuous_image" &&
      !exactEffect
        ? effects.find(
            (item) =>
              item.enabled === true &&
              item.amount === amount &&
              item.effectType ===
                "single_video",
          ) ?? null
        : null;

    const effect =
      exactEffect ??
      fallbackEffect;

    return NextResponse.json({
      success: true,
      amount,
      effectType,
      effect,
      fallbackFromVideo:
        !exactEffect &&
        Boolean(fallbackEffect),
    });
  } catch (error) {
    console.error(
      "DONATION EFFECT LOOKUP FAILED",
      error instanceof Error
        ? error.message
        : "unknown error",
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "후원 효과 조회에 실패했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}

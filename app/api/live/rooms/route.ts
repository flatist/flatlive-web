import { NextResponse } from "next/server";
import { listLiveRooms } from "@/lib/live/test-signaling-store";
import { getCreatorLevelSummary } from "@/lib/levels";

export async function GET() {
  try {
    const rooms = listLiveRooms();

    const roomsWithCreatorLevel = await Promise.all(
      rooms.map(async (room) => {
        try {
          const summary =
            await getCreatorLevelSummary(
              room.broadcasterUserId,
            );

          const rawLevel =
            summary.level as unknown;

          const broadcasterLevel =
            typeof rawLevel === "number"
              ? rawLevel
              : rawLevel &&
                  typeof rawLevel === "object" &&
                  "level" in rawLevel &&
                  typeof (rawLevel as { level?: unknown }).level === "number"
                ? (rawLevel as { level: number }).level
                : 1;

          return {
            ...room,
            broadcasterLevel,
          };
        } catch {
          return {
            ...room,
            broadcasterLevel: 1,
          };
        }
      }),
    );

    return NextResponse.json({
      success: true,
      rooms: roomsWithCreatorLevel,
    });
  } catch (error) {
    console.error("LIVE_ROOMS_GET_FAILED", error);

    return NextResponse.json(
      {
        success: false,
        error: "LIVE 목록을 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}

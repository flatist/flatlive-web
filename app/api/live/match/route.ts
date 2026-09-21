import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  cookies,
} from "next/headers";

import {
  AuthService,
} from "@/lib/auth/auth-service";

import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  getLiveRoom,
} from "@/lib/live/test-signaling-store";

import {
  clutchService,
} from "@/lib/live/match/clutch-service";

type ClutchSnapshot =
  NonNullable<
    Awaited<
      ReturnType<
        typeof clutchService.getSessionSnapshot
      >
    >
  >;

async function getCurrentActor() {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        SESSION_COOKIE_NAME,
      )?.value;

    if (!token) {
      return null;
    }

    return await new AuthService()
      .getCurrentUserSnapshot(
        token,
      );
  } catch {
    return null;
  }
}

function toLegacyMatch(
  snapshot: ClutchSnapshot,
) {
  const {
    session,
    participants,
    round,
    roundParticipants,
    scores,
  } = snapshot;

  const creator =
    participants.find(
      (item) =>
        item.userId ===
        session.createdByUserId,
    );

  return {
    matchId:
      session.clutchId,

    hostUserId:
      session.createdByUserId,

    hostRoomId:
      creator?.roomId ?? "",

    participantIds:
      participants.map(
        (item) => item.userId,
      ),

    participants:
      participants.map(
        (item) => ({
          userId:
            item.userId,

          roomId:
            item.roomId,

          nickname:
            item.nickname,

          avatarUrl:
            item.avatarUrl ??
            undefined,

          status:
            item.userId ===
                session.createdByUserId &&
            item.status === "ACCEPTED"
              ? "HOST"
              : item.status,

          joinedAt:
            item.joinedAt
              ? item.joinedAt.getTime()
              : null,
        }),
      ),

    scores,

    // FLATLIVE_CLUTCH_API_TEAM_SNAPSHOT_V12
    matchMode:
      round?.matchMode ??
      "SOLO",

    teamAssignments:
      round?.matchMode === "TEAM"
        ? roundParticipants
            .filter(
              (item) =>
                item.teamNo === 1 ||
                item.teamNo === 2,
            )
            .map(
              (item) => ({
                userId:
                  item.userId,

                teamNo:
                  item.teamNo as
                    1 | 2,

                seatNo:
                  item.seatNo,
              }),
            )
        : [],

    status:
      session.status,

    createdAt:
      session.createdAt.getTime(),

    startedAt:
      round?.startedAt
        ? round.startedAt.getTime()
        : null,

    endsAt:
      round?.endsAt
        ? round.endsAt.getTime()
        : null,

    finishedAt:
      round?.finishedAt
        ? round.finishedAt.getTime()
        : session.endedAt
          ? session.endedAt.getTime()
          : null,
  };
}

function errorResponse(
  error: unknown,
) {
  let message =
    error instanceof Error
      ? error.message
      : "MATCH_UNKNOWN_ERROR";

  if (
    message ===
    "CLUTCH_NOT_FOUND"
  ) {
    message =
      "MATCH_NOT_FOUND";
  }

  const status =
    message === "AUTH_REQUIRED"
      ? 401
      : message ===
          "LIVE_ROOM_FORBIDDEN" ||
        message ===
          "MATCH_INVITE_FORBIDDEN" ||
        message ===
          "MATCH_SCORE_SERVER_ONLY"
        ? 403
        : message ===
            "MATCH_NOT_FOUND"
          ? 404
          : 400;

  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    {
      status,
    },
  );
}

function assertLiveRoomOwner(
  roomId: string,
  userId: string,
) {
  const room =
    getLiveRoom(roomId);

  if (!room) {
    throw new Error(
      "LIVE_ROOM_NOT_FOUND",
    );
  }

  if (
    room.broadcasterUserId !==
    userId
  ) {
    throw new Error(
      "LIVE_ROOM_FORBIDDEN",
    );
  }

  return room;
}

export async function GET(
  request: NextRequest,
) {
  try {
    const matchId =
      request.nextUrl.searchParams
        .get("matchId")
        ?.trim() ?? "";

    const roomId =
      request.nextUrl.searchParams
        .get("roomId")
        ?.trim() ?? "";

    if (roomId) {
      const activeSnapshot =
        await clutchService
          .getRoomSnapshot(
            roomId,
          );

      let invites:
        ClutchSnapshot[] = [];

      const actor =
        await getCurrentActor();

      const room =
        getLiveRoom(roomId);

      console.log(
        "[CLUTCH_RECEIVER_TRACE] 1 room request",
        {
          roomId,
          actorUserId:
            actor?.userId ?? "",
          roomOwnerUserId:
            room?.broadcasterUserId ?? "",
          actorMatchesOwner:
            Boolean(
              actor &&
              room &&
              room.broadcasterUserId ===
                actor.userId,
            ),
        },
      );

      if (
        actor &&
        room &&
        room.broadcasterUserId ===
          actor.userId
      ) {
        invites =
          await clutchService
            .listRoomInvites(
              roomId,
            );
      }

      console.log(
        "[CLUTCH_RECEIVER_TRACE] 2 invites result",
        {
          roomId,
          inviteCount:
            invites.length,
          inviteIds:
            invites.map(
              (item) =>
                item.session.clutchId,
            ),
        },
      );

      return NextResponse.json({
        ok: true,

        activeMatch:
          activeSnapshot
            ? toLegacyMatch(
                activeSnapshot,
              )
            : null,

        invites:
          invites.map(
            toLegacyMatch,
          ),
      });
    }

    if (!matchId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "MATCH_ID_REQUIRED",
        },
        {
          status: 400,
        },
      );
    }

    const snapshot =
      await clutchService
        .getSessionSnapshot(
          matchId,
        );

    if (!snapshot) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "MATCH_NOT_FOUND",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      match:
        toLegacyMatch(
          snapshot,
        ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const actor =
      await getCurrentActor();

    if (!actor) {
      throw new Error(
        "AUTH_REQUIRED",
      );
    }

    const body =
      await request.json();

    const action =
      String(
        body?.action ?? "",
      ).trim();

    if (action === "create") {
      const hostRoomId =
        String(
          body?.hostRoomId ?? "",
        ).trim();

      if (!hostRoomId) {
        throw new Error(
          "MATCH_CREATE_FIELDS_REQUIRED",
        );
      }

      assertLiveRoomOwner(
        hostRoomId,
        actor.userId,
      );

      const clutchId =
        `clutch_${crypto.randomUUID()}`;

      const nickname =
        actor.displayName?.trim() ||
        actor.username?.trim() ||
        "방송자";

      await clutchService
        .createSession(
          clutchId,
          actor.userId,
          hostRoomId,
          nickname,
          body?.hostAvatarUrl
            ? String(
                body.hostAvatarUrl,
              )
            : null,
        );

      const snapshot =
        await clutchService
          .getSessionSnapshot(
            clutchId,
          );

      if (!snapshot) {
        throw new Error(
          "MATCH_CREATE_FAILED",
        );
      }

      return NextResponse.json({
        ok: true,
        match:
          toLegacyMatch(
            snapshot,
          ),
      });
    }

    const matchId =
      String(
        body?.matchId ?? "",
      ).trim();

    if (!matchId) {
      throw new Error(
        "MATCH_ID_REQUIRED",
      );
    }

    if (action === "invite") {
      // FLATLIVE_CLUTCH_INVITE_CANONICAL_ROOM_V1
      // 초대 대상 userId는 클라이언트 값을 신뢰하지 않고
      // 현재 LIVE room의 실제 broadcasterUserId로 확정한다.
      const requestedTargetUserId =
        String(
          body?.userId ?? "",
        ).trim();

      const roomId =
        String(
          body?.roomId ?? "",
        ).trim();

      const requestedNickname =
        String(
          body?.nickname ?? "",
        ).trim();

      if (!roomId) {
        throw new Error(
          "MATCH_INVITE_FIELDS_REQUIRED",
        );
      }

      const targetRoom =
        getLiveRoom(roomId);

      if (!targetRoom) {
        throw new Error(
          "LIVE_ROOM_NOT_FOUND",
        );
      }

      const targetUserId =
        targetRoom.broadcasterUserId
          ?.trim() ?? "";

      if (!targetUserId) {
        throw new Error(
          "LIVE_ROOM_OWNER_REQUIRED",
        );
      }

      const nickname =
        targetRoom.broadcasterName
          ?.trim() ||
        targetRoom.broadcasterUsername
          ?.trim() ||
        requestedNickname ||
        "방송자";

      if (
        requestedTargetUserId &&
        requestedTargetUserId !==
          targetUserId
      ) {
        console.warn(
          "CLUTCH_INVITE_TARGET_USER_SYNC",
          {
            roomId,
            requestedTargetUserId,
            actualTargetUserId:
              targetUserId,
          },
        );
      }

      if (
        targetUserId ===
        actor.userId
      ) {
        throw new Error(
          "MATCH_INVITE_SELF",
        );
      }

      const snapshot =
        await clutchService
          .getSessionSnapshot(
            matchId,
          );

      if (!snapshot) {
        throw new Error(
          "MATCH_NOT_FOUND",
        );
      }

      const actorParticipant =
        snapshot.participants.find(
          (item) =>
            item.userId ===
            actor.userId,
        );

      if (
        !actorParticipant ||
        actorParticipant.status !==
          "ACCEPTED"
      ) {
        throw new Error(
          "MATCH_INVITE_FORBIDDEN",
        );
      }

      const activeCount =
        snapshot.participants.filter(
          (item) =>
            item.status ===
              "ACCEPTED" ||
            item.status ===
              "INVITED",
        ).length;

      const alreadyExists =
        snapshot.participants.some(
          (item) =>
            item.userId ===
            targetUserId,
        );

      if (
        !alreadyExists &&
        activeCount >= 4
      ) {
        throw new Error(
          "MATCH_PARTICIPANT_LIMIT",
        );
      }

      assertLiveRoomOwner(
        roomId,
        targetUserId,
      );

      await clutchService
        .inviteParticipant(
          matchId,
          targetUserId,
          roomId,
          nickname,
          body?.avatarUrl
            ? String(
                body.avatarUrl,
              )
            : null,
        );

      const updated =
        await clutchService
          .getSessionSnapshot(
            matchId,
          );

      if (!updated) {
        throw new Error(
          "MATCH_NOT_FOUND",
        );
      }

      return NextResponse.json({
        ok: true,
        match:
          toLegacyMatch(
            updated,
          ),
      });
    }

    if (action === "accept") {
      // FLATLIVE_CLUTCH_ACCEPT_STALE_RECOVERY_V1
      // DB에는 ACCEPTED가 남아 있지만 실제 LIVE room은 서버 재시작 등으로
      // 사라진 경우가 있다. 새 초대 수락 전에 그런 유령 참여만 정리한다.
      const cleanup =
        await clutchService
          .cleanupStaleActiveParticipations(
            actor.userId,
            matchId,
            (candidateRoomId) =>
              Boolean(
                getLiveRoom(
                  candidateRoomId,
                ),
              ),
          );

      if (cleanup.cleaned > 0) {
        console.warn(
          "CLUTCH_ACCEPT_STALE_RECOVERY",
          {
            actorUserId: actor.userId,
            matchId,
            cleaned: cleanup.cleaned,
            staleClutchIds:
              cleanup.staleClutchIds,
          },
        );
      }

      await clutchService
        .acceptParticipant(
          matchId,
          actor.userId,
        );

      const snapshot =
        await clutchService
          .getSessionSnapshot(
            matchId,
          );

      if (!snapshot) {
        throw new Error(
          "MATCH_NOT_FOUND",
        );
      }

      return NextResponse.json({
        ok: true,
        match:
          toLegacyMatch(
            snapshot,
          ),
      });
    }

    if (action === "reject") {
      await clutchService
        .rejectParticipant(
          matchId,
          actor.userId,
        );

      const snapshot =
        await clutchService
          .getSessionSnapshot(
            matchId,
          );

      if (!snapshot) {
        throw new Error(
          "MATCH_NOT_FOUND",
        );
      }

      return NextResponse.json({
        ok: true,
        match:
          toLegacyMatch(
            snapshot,
          ),
      });
    }

    if (action === "start") {
      // FLATLIVE_CLUTCH_TEAM_API_START_V21

      const requestedMode:
        "SOLO" | "TEAM" =
          body?.matchMode ===
          "TEAM"
            ? "TEAM"
            : "SOLO";

      const requestedAssignments: {
        userId: string;
        teamNo: 1 | 2;
        seatNo: 1 | 2 | 3 | 4;
      }[] = [];

      if (
        Array.isArray(
          body?.teamAssignments,
        )
      ) {
        for (
          const raw
          of body.teamAssignments
        ) {
          if (
            !raw ||
            typeof raw !==
              "object"
          ) {
            continue;
          }

          const item =
            raw as {
              userId?: unknown;
              teamNo?: unknown;
              seatNo?: unknown;
            };

          if (
            typeof item.userId !==
              "string"
          ) {
            continue;
          }

          if (
            item.teamNo !== 1 &&
            item.teamNo !== 2
          ) {
            continue;
          }

          if (
            item.seatNo !== 1 &&
            item.seatNo !== 2 &&
            item.seatNo !== 3 &&
            item.seatNo !== 4
          ) {
            continue;
          }

          requestedAssignments.push({
            userId:
              item.userId.trim(),

            teamNo:
              item.teamNo,

            seatNo:
              item.seatNo,
          });
        }
      }

      await clutchService
        .startRound(
          matchId,
          actor.userId,
          Number(
            body?.durationSeconds ??
              180,
          ),
          requestedMode,
          requestedAssignments,
        );

      const snapshot =
        await clutchService
          .getSessionSnapshot(
            matchId,
          );

      if (!snapshot) {
        throw new Error(
          "MATCH_NOT_FOUND",
        );
      }

      return NextResponse.json({
        ok: true,
        match:
          toLegacyMatch(
            snapshot,
          ),
      });
    }

    if (action === "finish") {
      await clutchService
        .finishRound(
          matchId,
          actor.userId,
        );

      const snapshot =
        await clutchService
          .getSessionSnapshot(
            matchId,
          );

      if (!snapshot) {
        throw new Error(
          "MATCH_NOT_FOUND",
        );
      }

      return NextResponse.json({
        ok: true,
        match:
          toLegacyMatch(
            snapshot,
          ),
      });
    }

    if (action === "cancel") {
      await clutchService
        .leaveSession(
          matchId,
          actor.userId,
        );

      const snapshot =
        await clutchService
          .getSessionSnapshot(
            matchId,
          );

      return NextResponse.json({
        ok: true,

        match:
          snapshot
            ? toLegacyMatch(
                snapshot,
              )
            : null,
      });
    }

    if (action === "score") {
      throw new Error(
        "MATCH_SCORE_SERVER_ONLY",
      );
    }

    throw new Error(
      "MATCH_ACTION_INVALID",
    );
  } catch (error) {
    return errorResponse(error);
  }
}

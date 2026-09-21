export type LiveRecommendResult = {
  added: boolean;
  count: number;
};

type RecommendStore =
  Map<string, Set<string>>;

const globalForRecommend =
  globalThis as typeof globalThis & {
    flatliveRecommendStore?: RecommendStore;
  };

const recommendStore =
  globalForRecommend.flatliveRecommendStore ??
  new Map<string, Set<string>>();

globalForRecommend.flatliveRecommendStore =
  recommendStore;

export function getLiveRecommendCount(
  roomId: string,
) {
  return (
    recommendStore.get(roomId)?.size ??
    0
  );
}

export function hasLiveRecommended(
  roomId: string,
  userId: string,
) {
  if (
    !roomId ||
    !userId
  ) {
    return false;
  }

  return Boolean(
    recommendStore
      .get(roomId)
      ?.has(userId),
  );
}

export function addLiveRecommendation(
  roomId: string,
  userId: string,
): LiveRecommendResult {
  if (
    !roomId ||
    !userId
  ) {
    return {
      added: false,
      count:
        getLiveRecommendCount(
          roomId,
        ),
    };
  }

  const users =
    recommendStore.get(roomId) ??
    new Set<string>();

  if (users.has(userId)) {
    return {
      added: false,
      count: users.size,
    };
  }

  users.add(userId);

  recommendStore.set(
    roomId,
    users,
  );

  return {
    added: true,
    count: users.size,
  };
}

export function clearLiveRecommendations(
  roomId: string,
) {
  return recommendStore.delete(
    roomId,
  );
}

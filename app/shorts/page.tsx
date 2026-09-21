"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import ReportModal from "@/components/ReportModal";

type CommentItem = {
  id: string;
  contentType: "VOD" | "FLIT";
  contentId: string;
  userId: string;
  username: string;
  displayName: string;
  text: string;
  createdAt: string;
};

type FlitItem = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  title: string;
  description: string;
  visibility:
    | "public"
    | "followers"
    | "private";
  videoUrl: string;
  isAdult: boolean;
  createdAt: string;
  views: number;
  likes: number;
  greats: number;
  bests: number;
  comments: number;
};

function ShortsPageContent() {
  const searchParams =
    useSearchParams();

  const requestedFlitId =
    searchParams.get(
      "flitId",
    );

  const [
    bestFeedback,
    setBestFeedback,
  ] = useState<Record<string, boolean>>(
    {},
  );

  const [
    flits,
    setFlits,
  ] =
    useState<FlitItem[]>(
      [],
    );

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false);



  const [
    adultAccess,
    setAdultAccess,
  ] = useState<
    | "checking"
    | "allowed"
    | "login-required"
    | "verification-required"
    | "error"
  >("checking");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    traceId,
    setTraceId,
  ] =
    useState("");

  const countedViewIds =
    useRef<Set<string>>(
      new Set(),
    );

  const likingIds =
    useRef<Set<string>>(
      new Set(),
    );

  const [
    likedIds,
    setLikedIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  const greatPendingIds =
    useRef<Set<string>>(
      new Set(),
    );

  const bestPendingIds =
    useRef<Set<string>>(
      new Set(),
    );

  const [
    greatFeedback,
    setGreatFeedback,
  ] = useState<
    Record<string, boolean>
  >({});

  const [
    reportTarget,
    setReportTarget,
  ] = useState<FlitItem | null>(
    null,
  );

  const [
    reactionMenuFlitId,
    setReactionMenuFlitId,
  ] = useState<string | null>(
    null,
  );

  const [
    flitCommentTarget,
    setFlitCommentTarget,
  ] = useState<FlitItem | null>(
    null,
  );

  const [
    flitComments,
    setFlitComments,
  ] = useState<CommentItem[]>(
    [],
  );

  const [
    flitCommentText,
    setFlitCommentText,
  ] = useState("");

  const [
    flitCommentLoading,
    setFlitCommentLoading,
  ] = useState(false);

  const [
    flitCommentSubmitting,
    setFlitCommentSubmitting,
  ] = useState(false);

  const [
    flitCommentError,
    setFlitCommentError,
  ] = useState("");

  const [
    myUserId,
    setMyUserId,
  ] = useState("");

  const reactionMenuTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  async function loadCurrentUserForFlitComments() {
    try {
      const response =
        await fetch(
          "/api/auth/me",
          {
            cache: "no-store",
          },
        );

      const data =
        await response.json();

      const currentUserId =
        data?.id ||
        data?.user?.id ||
        data?.userId ||
        "";

      if (
        response.ok &&
        currentUserId
      ) {
        setMyUserId(
          String(
            currentUserId,
          ),
        );
      }
    } catch (error) {
      console.error(
        "FLIT COMMENT CURRENT USER ERROR",
        error,
      );
    }
  }

  async function handleFlitShare(
    flit: FlitItem,
  ) {
    const url =
      `${window.location.origin}/shorts?flitId=${encodeURIComponent(
        flit.id,
      )}`;

    try {
      if (
        typeof navigator.share ===
        "function"
      ) {
        await navigator.share({
          title:
            flit.title ||
            "FLATLIVE FLIT",
          text:
            flit.description ||
            "",
          url,
        });

        return;
      }

      await navigator.clipboard.writeText(
        url,
      );

      alert(
        "FLIT 링크가 복사되었습니다.",
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "FLIT SHARE ERROR",
        error,
      );

      try {
        await navigator.clipboard.writeText(
          url,
        );

        alert(
          "FLIT 링크가 복사되었습니다.",
        );
      } catch {
        alert(
          "공유에 실패했습니다.",
        );
      }
    }
  }

  async function openFlitComments(
    flit: FlitItem,
  ) {
    void loadCurrentUserForFlitComments();
    setFlitCommentTarget(
      flit,
    );

    setFlitCommentText("");
    setFlitCommentError("");
    setFlitCommentLoading(true);

    try {
      const response =
        await fetch(
          `/api/comments?contentType=FLIT&contentId=${encodeURIComponent(
            flit.id,
          )}`,
          {
            cache: "no-store",
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        setFlitCommentError(
          data.error ||
            "댓글을 불러오지 못했습니다.",
        );

        return;
      }

      setFlitComments(
        Array.isArray(
          data.comments,
        )
          ? data.comments
          : [],
      );

      if (
        typeof data.count ===
        "number"
      ) {
        setFlits(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                flit.id
                  ? {
                      ...item,
                      comments:
                        data.count,
                    }
                  : item,
            ),
        );
      }
    } catch (error) {
      console.error(
        "FLIT COMMENT GET ERROR",
        error,
      );

      setFlitCommentError(
        "댓글을 불러오는 중 오류가 발생했습니다.",
      );
    } finally {
      setFlitCommentLoading(false);
    }
  }

  async function submitFlitComment() {
    if (
      !flitCommentTarget
    ) {
      return;
    }

    const text =
      flitCommentText.trim();

    if (
      !text ||
      flitCommentSubmitting
    ) {
      return;
    }

    setFlitCommentSubmitting(true);
    setFlitCommentError("");

    try {
      const response =
        await fetch(
          "/api/comments",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              contentType:
                "FLIT",
              contentId:
                flitCommentTarget.id,
              text,
            }),
          },
        );

      const data =
        await response.json();

      if (
        response.status === 401
      ) {
        alert(
          data.error ||
            "댓글을 작성하려면 로그인이 필요합니다.",
        );

        return;
      }

      if (
        !response.ok ||
        !data.success
      ) {
        setFlitCommentError(
          data.error ||
            "댓글 작성에 실패했습니다.",
        );

        return;
      }

      if (
        data.comment?.userId
      ) {
        setMyUserId(
          String(
            data.comment.userId,
          ),
        );
      }

      if (data.comment) {
        setFlitComments(
          (current) => [
            ...current,
            data.comment as CommentItem,
          ],
        );
      }

      const nextCount =
        typeof data.count ===
          "number"
          ? data.count
          : flitComments.length +
            1;

      setFlits(
        (current) =>
          current.map(
            (item) =>
              item.id ===
                flitCommentTarget.id
                ? {
                    ...item,
                    comments:
                      nextCount,
                  }
                : item,
          ),
      );

      setFlitCommentTarget(
        (current) =>
          current
            ? {
                ...current,
                comments:
                  nextCount,
              }
            : current,
      );

      setFlitCommentText("");
    } catch (error) {
      console.error(
        "FLIT COMMENT POST ERROR",
        error,
      );

      setFlitCommentError(
        "댓글 작성 중 오류가 발생했습니다.",
      );
    } finally {
      setFlitCommentSubmitting(false);
    }
  }

  async function deleteFlitComment(
    commentId: string,
  ) {
    if (
      !flitCommentTarget
    ) {
      return;
    }

    const ok =
      window.confirm(
        "댓글을 삭제하시겠습니까?",
      );

    if (!ok) {
      return;
    }

    try {
      const response =
        await fetch(
          "/api/comments",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              commentId,
            }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        alert(
          data.error ||
            "댓글 삭제에 실패했습니다.",
        );

        return;
      }

      setFlitComments(
        (current) =>
          current.filter(
            (comment) =>
              comment.id !==
              commentId,
          ),
      );

      if (
        typeof data.count ===
        "number"
      ) {
        setFlits(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                  flitCommentTarget.id
                  ? {
                      ...item,
                      comments:
                        data.count,
                    }
                  : item,
            ),
        );

        setFlitCommentTarget(
          (current) =>
            current
              ? {
                  ...current,
                  comments:
                    data.count,
                }
              : current,
        );
      }
    } catch (error) {
      console.error(
        "FLIT COMMENT DELETE ERROR",
        error,
      );

      alert(
        "댓글 삭제 중 오류가 발생했습니다.",
      );
    }
  }

  function openReactionMenu(
    flitId: string,
  ) {
    if (
      reactionMenuTimerRef.current
    ) {
      clearTimeout(
        reactionMenuTimerRef.current,
      );
    }

    setReactionMenuFlitId(
      flitId,
    );

    reactionMenuTimerRef.current =
      setTimeout(() => {
        setReactionMenuFlitId(
          null,
        );

        reactionMenuTimerRef.current =
          null;
      }, 3000);
  }

  function closeReactionMenu() {
    if (
      reactionMenuTimerRef.current
    ) {
      clearTimeout(
        reactionMenuTimerRef.current,
      );

      reactionMenuTimerRef.current =
        null;
    }

    setReactionMenuFlitId(
      null,
    );
  }

  async function handleFlitGreat(
    flitId: string,
  ) {
    if (
      greatPendingIds.current.has(
        flitId,
      )
    ) {
      return;
    }

    const target =
      flits.find(
        (item) =>
          item.id === flitId,
      );

    if (!target) {
      return;
    }

    const previousGreats =
      target.greats;

    greatPendingIds.current.add(
      flitId,
    );

    // 즉시 내부 상태 반영
    setFlits((current) =>
      current.map((item) =>
        item.id === flitId
          ? {
              ...item,
              greats:
                previousGreats + 1,
            }
          : item,
      ),
    );

    // 누르는 즉시 피드백
    setGreatFeedback(
      (current) => ({
        ...current,
        [flitId]: true,
      }),
    );

    const rollback = () => {
      setFlits((current) =>
        current.map((item) =>
          item.id === flitId
            ? {
                ...item,
                greats:
                  previousGreats,
              }
            : item,
        ),
      );

      setGreatFeedback(
        (current) => ({
          ...current,
          [flitId]: false,
        }),
      );
    };

    try {
      const response =
        await fetch(
          "/api/reaction/great",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              contentType:
                "FLIT",
              contentId:
                flitId,
            }),
          },
        );

      const data =
        await response.json();

      if (
        response.status === 401
      ) {
        rollback();

        alert(
          "로그인이 필요합니다.",
        );

        return;
      }

      if (
        !response.ok ||
        !data.success
      ) {
        rollback();

        console.error(
          "FLIT GREAT ERROR",
          data,
        );

        alert(
          data.error ||
            "멋져요 처리에 실패했습니다.",
        );

        return;
      }

      // 서버 확정값 동기화
      setFlits((current) =>
        current.map((item) =>
          item.id === flitId
            ? {
                ...item,
                greats:
                  typeof data.greats ===
                  "number"
                    ? data.greats
                    : item.greats,
              }
            : item,
        ),
      );

      window.setTimeout(() => {
        setGreatFeedback(
          (current) => ({
            ...current,
            [flitId]: false,
          }),
        );
      }, 1200);
    } catch (error) {
      rollback();

      console.error(
        "FLIT GREAT NETWORK ERROR",
        error,
      );

      alert(
        "멋져요 처리 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      greatPendingIds.current.delete(
        flitId,
      );
    }
  }

  async function handleFlitBest(
    flitId: string,
  ) {
    if (
      bestPendingIds.current.has(
        flitId,
      )
    ) {
      return;
    }

    const target =
      flits.find(
        (item) =>
          item.id === flitId,
      );

    if (!target) {
      return;
    }

    const previousBests =
      target.bests;

    bestPendingIds.current.add(
      flitId,
    );

    // 즉시 내부 상태 반영
    setFlits((current) =>
      current.map((item) =>
        item.id === flitId
          ? {
              ...item,
              bests:
                previousBests + 1,
            }
          : item,
      ),
    );

    // 누르는 즉시 피드백
    setBestFeedback(
      (current) => ({
        ...current,
        [flitId]: true,
      }),
    );

    const rollback = () => {
      setFlits((current) =>
        current.map((item) =>
          item.id === flitId
            ? {
                ...item,
                bests:
                  previousBests,
              }
            : item,
        ),
      );

      setBestFeedback(
        (current) => ({
          ...current,
          [flitId]: false,
        }),
      );
    };

    try {
      const response =
        await fetch(
          "/api/reaction/best",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              contentType:
                "FLIT",
              contentId:
                flitId,
            }),
          },
        );

      const data =
        await response.json();

      if (
        response.status === 401
      ) {
        rollback();

        alert(
          "로그인이 필요합니다.",
        );

        return;
      }

      if (
        !response.ok ||
        !data.success
      ) {
        rollback();

        console.error(
          "FLIT BEST ERROR",
          data,
        );

        alert(
          data.error ||
            "최고예요 처리에 실패했습니다.",
        );

        return;
      }

      // 서버 확정값 동기화
      setFlits((current) =>
        current.map((item) =>
          item.id === flitId
            ? {
                ...item,
                bests:
                  typeof data.bests ===
                  "number"
                    ? data.bests
                    : item.bests,
              }
            : item,
        ),
      );

      window.setTimeout(() => {
        setBestFeedback(
          (current) => ({
            ...current,
            [flitId]: false,
          }),
        );
      }, 1200);
    } catch (error) {
      rollback();

      console.error(
        "FLIT BEST NETWORK ERROR",
        error,
      );

      alert(
        "최고예요 처리 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      bestPendingIds.current.delete(
        flitId,
      );
    }
  }

  async function handleFlitLike(
    flitId: string,
  ) {
    if (
      likingIds.current.has(
        flitId,
      )
    ) {
      return;
    }

    const target =
      flits.find(
        (item) =>
          item.id === flitId,
      );

    if (!target) {
      return;
    }

    const previousLiked =
      likedIds.has(flitId);

    const previousLikes =
      target.likes;

    const optimisticLiked =
      !previousLiked;

    const optimisticLikes =
      optimisticLiked
        ? previousLikes + 1
        : Math.max(
            0,
            previousLikes - 1,
          );

    likingIds.current.add(
      flitId,
    );

    // 서버 응답 전에 즉시 화면 반영
    setFlits((current) =>
      current.map((item) =>
        item.id === flitId
          ? {
              ...item,
              likes:
                optimisticLikes,
            }
          : item,
      ),
    );

    setLikedIds((current) => {
      const next =
        new Set(current);

      if (optimisticLiked) {
        next.add(flitId);
      } else {
        next.delete(flitId);
      }

      return next;
    });

    const rollback = () => {
      setFlits((current) =>
        current.map((item) =>
          item.id === flitId
            ? {
                ...item,
                likes:
                  previousLikes,
              }
            : item,
        ),
      );

      setLikedIds((current) => {
        const next =
          new Set(current);

        if (previousLiked) {
          next.add(flitId);
        } else {
          next.delete(flitId);
        }

        return next;
      });
    };

    try {
      const response =
        await fetch(
          "/api/reaction/like",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              contentType:
                "FLIT",
              contentId:
                flitId,
            }),
          },
        );

      const data =
        await response.json();

      if (
        response.status === 401
      ) {
        rollback();

        alert(
          "로그인이 필요합니다.",
        );

        return;
      }

      if (
        !response.ok ||
        !data.success
      ) {
        rollback();

        console.error(
          "FLIT LIKE ERROR",
          data,
        );

        alert(
          data.error ||
            "좋아요 처리에 실패했습니다.",
        );

        return;
      }

      // 서버 확정값으로 최종 동기화
      setFlits((current) =>
        current.map((item) =>
          item.id === flitId
            ? {
                ...item,
                likes:
                  typeof data.likes ===
                  "number"
                    ? data.likes
                    : item.likes,
              }
            : item,
        ),
      );

      if (
        typeof data.liked ===
        "boolean"
      ) {
        setLikedIds(
          (current) => {
            const next =
              new Set(current);

            if (data.liked) {
              next.add(flitId);
            } else {
              next.delete(
                flitId,
              );
            }

            return next;
          },
        );
      }
    } catch (error) {
      rollback();

      console.error(
        "FLIT LIKE NETWORK ERROR",
        error,
      );

      alert(
        "좋아요 처리 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      likingIds.current.delete(
        flitId,
      );
    }
  }

  const soundEnabledRef =
    useRef(false);

  const [
    controlsVisible,
    setControlsVisible,
  ] = useState(true);

  const controlsTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const [
    pausedByFlit,
    setPausedByFlit,
  ] = useState<Record<string, boolean>>({});

  function clearControlsTimer() {
    if (
      controlsTimerRef.current
    ) {
      clearTimeout(
        controlsTimerRef.current,
      );

      controlsTimerRef.current =
        null;
    }
  }

  function showControlsTemporarily() {
    clearControlsTimer();

    setControlsVisible(true);

    controlsTimerRef.current =
      setTimeout(() => {
        setControlsVisible(false);
        controlsTimerRef.current =
          null;
      }, 3000);
  }

  const [
    playbackTimes,
    setPlaybackTimes,
  ] = useState<
    Record<
      string,
      {
        current: number;
        duration: number;
      }
    >
  >({});

  const playbackProgress =
    useRef<
      Record<
        string,
        {
          lastTime: number;
          watched: number;
          fitWatchSeconds: number;
          lastFitInterval: number;
          fitPending: boolean;
        }
      >
    >({});


  const flitAnalyticsSessionRef =
    useRef("");

  const flitAnalyticsPoints =
    useRef<
      Record<
        string,
        {
          lastTime: number;
          lastSentAt: number;
          pendingWatched: number;
        }
      >
    >({});

  function getFlitAnalyticsSessionId() {
    if (
      flitAnalyticsSessionRef.current
    ) {
      return flitAnalyticsSessionRef.current;
    }

    const storageKey =
      "flatlive-video-analytics-session";

    try {
      const existing =
        window.sessionStorage.getItem(
          storageKey,
        );

      if (existing) {
        flitAnalyticsSessionRef.current =
          existing;

        return existing;
      }

      const next =
        crypto.randomUUID();

      window.sessionStorage.setItem(
        storageKey,
        next,
      );

      flitAnalyticsSessionRef.current =
        next;

      return next;
    } catch {
      const fallback =
        crypto.randomUUID();

      flitAnalyticsSessionRef.current =
        fallback;

      return fallback;
    }
  }

  function getFlitAnalyticsPoint(
    flitId: string,
    currentTime = 0,
  ) {
    const current =
      flitAnalyticsPoints.current[
        flitId
      ];

    if (current) {
      return current;
    }

    const next = {
      lastTime: currentTime,
      lastSentAt: 0,
      pendingWatched: 0,
    };

    flitAnalyticsPoints.current[
      flitId
    ] = next;

    return next;
  }

  function sendFlitAnalyticsEvent(
    flitId: string,
    eventType:
      | "PLAY"
      | "PAUSE"
      | "PROGRESS"
      | "SEEK"
      | "COMPLETE",
    video: HTMLVideoElement,
    watchedDelta = 0,
  ) {
    const isAdultVideo =
      video.dataset.flitAdult ===
      "true";

    if (
      isAdultVideo &&
      adultAccess !== "allowed"
    ) {
      return;
    }

    const duration =
      Number.isFinite(
        video.duration,
      )
        ? video.duration
        : 0;

    const currentTime =
      Number.isFinite(
        video.currentTime,
      )
        ? video.currentTime
        : 0;

    void fetch(
      "/api/analytics/video",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          contentType: "FLIT",
          contentId: flitId,
          viewerSessionId:
            getFlitAnalyticsSessionId(),
          source: "FLIT_FEED",
          eventType,
          currentTime,
          duration,
          watchedDelta,
        }),
      },
    ).catch((error) => {
      console.error(
        "FLIT ANALYTICS ERROR:",
        error,
      );
    });
  }

  function resetFlitAnalyticsPoint(
    flitId: string,
    currentTime: number,
  ) {
    const point =
      getFlitAnalyticsPoint(
        flitId,
        currentTime,
      );

    point.lastTime =
      currentTime;
  }

  function trackFlitAnalytics(
    flitId: string,
    video: HTMLVideoElement,
  ) {
    const currentTime =
      Number.isFinite(
        video.currentTime,
      )
        ? video.currentTime
        : 0;

    const point =
      getFlitAnalyticsPoint(
        flitId,
        currentTime,
      );

    const delta =
      currentTime -
      point.lastTime;

    point.lastTime =
      currentTime;

    if (
      !video.paused &&
      !video.seeking &&
      delta > 0 &&
      delta <= 1.5
    ) {
      point.pendingWatched +=
        delta;
    }

    const now =
      Date.now();

    if (
      point.pendingWatched > 0 &&
      now - point.lastSentAt >=
        4000
    ) {
      const watchedDelta =
        point.pendingWatched;

      point.pendingWatched = 0;
      point.lastSentAt = now;

      sendFlitAnalyticsEvent(
        flitId,
        "PROGRESS",
        video,
        watchedDelta,
      );
    }
  }

  function flushFlitAnalytics(
    flitId: string,
    video: HTMLVideoElement,
  ) {
    const point =
      getFlitAnalyticsPoint(
        flitId,
        video.currentTime,
      );

    if (
      point.pendingWatched <= 0
    ) {
      return;
    }

    const watchedDelta =
      point.pendingWatched;

    point.pendingWatched = 0;
    point.lastSentAt =
      Date.now();

    sendFlitAnalyticsEvent(
      flitId,
      "PROGRESS",
      video,
      watchedDelta,
    );
  }

  function resetPlaybackPoint(
    flitId: string,
    currentTime: number,
  ) {
    const progress =
      playbackProgress.current[
        flitId
      ] ?? {
        lastTime:
          currentTime,
        watched: 0,
        fitWatchSeconds: 30,
        lastFitInterval: 0,
        fitPending: false,
      };

    progress.lastTime =
      currentTime;

    playbackProgress.current[
      flitId
    ] = progress;
  }

  function trackFlitPlayback(
    flitId: string,
    video:
      HTMLVideoElement,
  ) {
    const currentTime =
      video.currentTime;

    if (
      !Number.isFinite(
        currentTime,
      )
    ) {
      return;
    }

    const progress =
      playbackProgress.current[
        flitId
      ] ?? {
        lastTime:
          currentTime,
        watched: 0,
        fitWatchSeconds: 30,
        lastFitInterval: 0,
        fitPending: false,
      };

    const delta =
      currentTime -
      progress.lastTime;

    if (
      !video.paused &&
      !video.seeking &&
      delta > 0 &&
      delta <= 1.5
    ) {
      progress.watched +=
        delta;
    }

    progress.lastTime =
      currentTime;

    playbackProgress.current[
      flitId
    ] = progress;

    const shouldCountView =
      !countedViewIds.current.has(
        flitId,
      ) &&
      progress.watched >= 3;

    const intervalIndex =
      Math.floor(
        progress.watched /
          Math.max(
            1,
            progress.fitWatchSeconds,
          ),
      );

    const shouldAwardFit =
      intervalIndex >
        progress.lastFitInterval &&
      !progress.fitPending;

    if (
      !shouldCountView &&
      !shouldAwardFit
    ) {
      return;
    }

    if (shouldCountView) {
      countedViewIds.current.add(
        flitId,
      );
    }

    if (shouldAwardFit) {
      progress.fitPending =
        true;
    }

    void fetch(
      "/api/flit/view",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          flitId,
          countView:
            shouldCountView,
          watchedSeconds:
            progress.watched,
          fitIntervalIndex:
            shouldAwardFit
              ? intervalIndex
              : 0,
        }),
      },
    )
      .then(
        async (
          response,
        ) => {
          const data =
            await response.json();

          if (
            !response.ok ||
            !data.success
          ) {
            console.error(
              "FLIT VIEW/FIT ERROR",
              data,
            );

            return;
          }

          if (
            typeof data.fitWatchSeconds ===
              "number" &&
            data.fitWatchSeconds > 0
          ) {
            progress.fitWatchSeconds =
              Math.floor(
                data.fitWatchSeconds,
              );
          }

          if (shouldAwardFit) {
            progress.lastFitInterval =
              intervalIndex;
          }

          if (
            shouldCountView &&
            typeof data.views ===
              "number"
          ) {
            setFlits(
              (
                current,
              ) =>
                current.map(
                  (
                    item,
                  ) =>
                    item.id ===
                    flitId
                      ? {
                          ...item,
                          views:
                            data.views,
                        }
                      : item,
                ),
            );
          }
        },
      )
      .catch(
        (
          viewError,
        ) => {
          console.error(
            "FLIT VIEW/FIT NETWORK ERROR",
            viewError,
          );
        },
      )
      .finally(() => {
        if (shouldAwardFit) {
          progress.fitPending =
            false;
        }
      });
  }

  useEffect(() => {
    let cancelled =
      false;

    async function loadFlits() {
      try {
        const response =
          await fetch(
            "/api/flit",
            {
              cache:
                "no-store",
            },
          );

        const data =
          await response.json();

        if (cancelled) {
          return;
        }

        if (
          !response.ok ||
          !data.success
        ) {
          setError(
            data.error ||
              "FLIT을 불러오지 못했습니다.",
          );

          setTraceId(
            data.traceId ||
              "",
          );

          return;
        }

        const nextFlits:
          FlitItem[] =
          Array.isArray(
            data.flits,
          )
            ? data.flits.map(
                (
                  item: FlitItem,
                ) => ({
                  ...item,
                  isAdult:
                    item.isAdult ===
                    true,
                }),
              )
            : [];

        setFlits(
          nextFlits,
        );

        setTraceId(
          data.traceId ||
            "",
        );
      } catch (
        loadError
      ) {
        console.error(
          "FLIT FEED LOAD ERROR",
          loadError,
        );

        if (
          !cancelled
        ) {
          setError(
            "FLIT 피드를 불러오는 중 네트워크 오류가 발생했습니다.",
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false,
          );
        }
      }
    }

    void loadFlits();

    return () => {
      cancelled =
        true;
    };
  }, []);

  useEffect(() => {
    const hasAdultFlit =
      flits.some(
        (item) =>
          item.isAdult === true,
      );

    if (!hasAdultFlit) {
      setAdultAccess(
        "allowed",
      );
      return;
    }

    let cancelled = false;

    async function checkAdultAccess() {
      try {
        setAdultAccess(
          "checking",
        );

        const response =
          await fetch(
            "/api/adult/status",
            {
              cache: "no-store",
            },
          );

        const data =
          await response.json();

        if (cancelled) {
          return;
        }

        if (
          !response.ok ||
          !data.success
        ) {
          setAdultAccess(
            "error",
          );
          return;
        }

        if (
          data.loggedIn !== true
        ) {
          setAdultAccess(
            "login-required",
          );
          return;
        }

        if (
          data.verified !== true
        ) {
          setAdultAccess(
            "verification-required",
          );
          return;
        }

        setAdultAccess(
          "allowed",
        );
      } catch (error) {
        console.error(
          "FLIT ADULT STATUS FAILED:",
          error,
        );

        if (!cancelled) {
          setAdultAccess(
            "error",
          );
        }
      }
    }

    void checkAdultAccess();

    return () => {
      cancelled = true;
    };
  }, [flits]);

  useEffect(() => {
    if (
      flits.length === 0
    ) {
      return;
    }

    const videos =
      Array.from(
        document.querySelectorAll<HTMLVideoElement>(
          "video[data-flit-video]",
        ),
      );

    const observer =
      new IntersectionObserver(
        (entries) => {
          for (
            const entry
            of entries
          ) {
            const video =
              entry.target as HTMLVideoElement;

            const isAdultVideo =
              video.dataset
                .flitAdult ===
              "true";

            if (
              isAdultVideo &&
              adultAccess !==
                "allowed"
            ) {
              video.pause();

              if (
                video.currentTime > 0
              ) {
                video.currentTime =
                  0;
              }

              continue;
            }

            if (
              !entry.isIntersecting ||
              entry.intersectionRatio < 0.6
            ) {
              video.pause();

              if (
                video.currentTime > 0
              ) {
                video.currentTime =
                  0;
              }

              continue;
            }

            for (
              const otherVideo
              of videos
            ) {
              if (
                otherVideo !== video &&
                !otherVideo.paused
              ) {
                otherVideo.pause();
              }
            }

            video.muted =
              !soundEnabledRef.current;

            if (
              video.paused
            ) {
              void video
                .play()
                .catch(() => {
                  video.muted =
                    true;

                  void video
                    .play()
                    .catch(() => {
                      // 사용자의 첫 재생 동작 전까지
                      // 브라우저가 자동재생을 제한할 수 있습니다.
                    });
                });
            }
          }
        },
        {
          threshold: [
            0,
            0.6,
            1,
          ],
        },
      );

    for (
      const video
      of videos
    ) {
      observer.observe(
        video,
      );
    }

    return () => {
      observer.disconnect();
    };
  }, [
    flits.length,
    adultAccess,
  ]);

  const normalizedSearchQuery =
    searchQuery
      .trim()
      .toLowerCase();

  const searchedFlits =
    normalizedSearchQuery
      ? flits.filter(
          (flit) => {
            const searchableText = [
              flit.title,
              flit.displayName,
              flit.username,
              flit.description,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return searchableText.includes(
              normalizedSearchQuery,
            );
          },
        )
      : flits;

  const displayedFlits =
    requestedFlitId
      ? [
          ...searchedFlits.filter(
            (flit) =>
              flit.id ===
              requestedFlitId,
          ),
          ...searchedFlits.filter(
            (flit) =>
              flit.id !==
              requestedFlitId,
          ),
        ]
      : searchedFlits;

  if (loading) {
    return (
      <main className="flex h-[100dvh] items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-sm font-black text-flat-yellow">
            FLIT
          </div>

          <p className="mt-3 text-xs text-zinc-500">
            피드를 불러오는 중...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex h-[100dvh] items-center justify-center bg-black px-5 text-white">
        <div className="max-w-sm rounded-3xl border border-red-500/20 bg-zinc-950 p-6 text-center">
          <strong className="text-sm">
            FLIT을 불러오지 못했습니다.
          </strong>

          <p className="mt-3 text-xs text-red-300">
            {error}
          </p>

          {traceId && (
            <p className="mt-3 break-all text-[10px] text-zinc-600">
              Trace ID:{" "}
              {traceId}
            </p>
          )}

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="mt-5 rounded-xl bg-flat-yellow px-4 py-2 text-xs font-black text-black"
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  if (
    flits.length === 0
  ) {
    return (
      <main className="flex h-[100dvh] items-center justify-center bg-black px-5 text-white">
        <div className="text-center">
          <strong className="text-lg">
            아직 공개된 FLIT이 없습니다.
          </strong>

          <p className="mt-2 text-sm text-zinc-500">
            첫 번째 FLIT을 올려보세요.
          </p>

          <a
            href="/shorts/upload"
            className="mt-5 inline-flex rounded-xl bg-flat-yellow px-5 py-3 text-sm font-black text-black"
          >
            FLIT 올리기
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[calc(100dvh-68px)] overflow-y-auto snap-y snap-mandatory bg-black text-white [scrollbar-width:none] md:h-[calc(100vh-4rem)] md:mt-16">
      <div className="fixed right-4 top-3 z-[150] md:top-20">
        {!searchOpen ? (
          <button
            type="button"
            onClick={() =>
              setSearchOpen(true)
            }
            aria-label="FLIT 검색 열기"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/75 text-lg text-white shadow-xl backdrop-blur-xl transition hover:bg-white/10"
          >
            🔍
          </button>
        ) : (
          <div className="w-[calc(100vw-32px)] max-w-md">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/80 px-4 py-3 shadow-xl backdrop-blur-xl">
              <span
                aria-hidden="true"
                className="shrink-0 text-sm text-zinc-500"
              >
                🔍
              </span>

              <input
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value,
                  )
                }
                placeholder="FLIT 영상 또는 크리에이터 검색"
                aria-label="FLIT 검색"
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-zinc-600"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery("")
                  }
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-zinc-400 hover:bg-white/10 hover:text-white"
                >
                  지우기
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
                aria-label="FLIT 검색 닫기"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            {normalizedSearchQuery &&
              searchedFlits.length === 0 && (
                <div className="mt-2 rounded-xl border border-white/10 bg-black/85 px-4 py-3 text-center text-xs font-bold text-zinc-400 backdrop-blur-xl">
                  검색 결과가 없습니다.
                </div>
              )}
          </div>
        )}
      </div>
      {displayedFlits.map(
        (flit) => {
          const creatorName =
            flit.displayName ||
            flit.username ||
            "FLATIST";

          const creatorHandle =
            flit.username
              ? `@${flit.username}`
              : creatorName;

          return (
            <section
              key={
                flit.id
              }
              className="relative mx-auto h-[calc(100dvh-68px)] w-full snap-start snap-always overflow-hidden bg-black md:h-[calc(100vh-4rem)] md:max-w-md"
            >
              {/* REAL VIDEO */}
              <video
                data-flit-video
                data-flit-id={flit.id}
                data-flit-adult={
                  flit.isAdult ===
                  true
                    ? "true"
                    : "false"
                }
                src={
                  flit.isAdult ===
                    true &&
                  adultAccess !==
                    "allowed"
                    ? undefined
                    : flit.videoUrl
                }
                className="absolute inset-0 h-full w-full bg-black object-cover"
                playsInline
                loop
                preload="metadata"
                onClick={(event) => {
                  const video =
                    event.currentTarget;

                  if (
                    video.muted
                  ) {
                    soundEnabledRef.current =
                      true;

                    video.muted =
                      false;
                  }

                  if (
                    video.paused
                  ) {
                    void video.play();
                  } else {
                    video.pause();
                  }

                  showControlsTemporarily();
                }}
                onLoadedMetadata={(event) => {
                  const video =
                    event.currentTarget;

                  setPlaybackTimes(
                    (current) => ({
                      ...current,
                      [flit.id]: {
                        current:
                          video.currentTime,
                        duration:
                          Number.isFinite(
                            video.duration,
                          )
                            ? video.duration
                            : 0,
                      },
                    }),
                  );
                }}
                onPlay={(event) => {
                  const video =
                    event.currentTarget;

                  resetPlaybackPoint(
                    flit.id,
                    video.currentTime,
                  );

                  resetFlitAnalyticsPoint(
                    flit.id,
                    video.currentTime,
                  );

                  sendFlitAnalyticsEvent(
                    flit.id,
                    "PLAY",
                    video,
                  );

                  setPausedByFlit(
                    (current) => ({
                      ...current,
                      [flit.id]:
                        false,
                    }),
                  );
                }}
                onPause={(event) => {
                  const video =
                    event.currentTarget;

                  flushFlitAnalytics(
                    flit.id,
                    video,
                  );

                  resetPlaybackPoint(
                    flit.id,
                    video.currentTime,
                  );

                  resetFlitAnalyticsPoint(
                    flit.id,
                    video.currentTime,
                  );

                  sendFlitAnalyticsEvent(
                    flit.id,
                    "PAUSE",
                    video,
                  );

                  setPausedByFlit(
                    (current) => ({
                      ...current,
                      [flit.id]:
                        true,
                    }),
                  );
                }}
                onSeeking={(event) => {
                  const video =
                    event.currentTarget;

                  flushFlitAnalytics(
                    flit.id,
                    video,
                  );

                  resetPlaybackPoint(
                    flit.id,
                    video.currentTime,
                  );

                  resetFlitAnalyticsPoint(
                    flit.id,
                    video.currentTime,
                  );

                  sendFlitAnalyticsEvent(
                    flit.id,
                    "SEEK",
                    video,
                  );
                }}
                onTimeUpdate={(event) => {
                  const video =
                    event.currentTarget;

                  trackFlitPlayback(
                    flit.id,
                    video,
                  );

                  trackFlitAnalytics(
                    flit.id,
                    video,
                  );

                  const duration =
                    Number.isFinite(
                      video.duration,
                    )
                      ? video.duration
                      : 0;

                  if (
                    duration > 0 &&
                    video.currentTime >=
                      duration - 0.35
                  ) {
                    flushFlitAnalytics(
                      flit.id,
                      video,
                    );

                    sendFlitAnalyticsEvent(
                      flit.id,
                      "COMPLETE",
                      video,
                    );
                  }

                  setPlaybackTimes(
                    (current) => ({
                      ...current,
                      [flit.id]: {
                        current:
                          video.currentTime,
                        duration:
                          Number.isFinite(
                            video.duration,
                          )
                            ? video.duration
                            : 0,
                      },
                    }),
                  );
                }}
              />

              {flit.isAdult ===
                true &&
                adultAccess !==
                  "allowed" && (
                  <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black px-6">
                    <div className="w-full max-w-sm text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-xl font-black text-white">
                        19+
                      </div>

                      <h2 className="mt-5 text-xl font-black text-white">
                        19세 이상 콘텐츠입니다
                      </h2>

                      {adultAccess ===
                        "checking" && (
                        <p className="mt-3 text-sm text-zinc-400">
                          성인인증 상태를 확인하고 있습니다.
                        </p>
                      )}

                      {adultAccess ===
                        "login-required" && (
                        <>
                          <p className="mt-3 text-sm leading-6 text-zinc-400">
                            이 FLIT을 시청하려면 로그인 후 성인인증이 필요합니다.
                          </p>

                          <a
                            href="/login"
                            className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-flat-yellow text-sm font-black text-black"
                          >
                            로그인
                          </a>
                        </>
                      )}

                      {adultAccess ===
                        "verification-required" && (
                        <>
                          <p className="mt-3 text-sm leading-6 text-zinc-400">
                            휴대폰 본인인증을 완료한 성인만 시청할 수 있습니다.
                          </p>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const response =
                                  await fetch(
                                    "/api/adult/verify/start",
                                    {
                                      method:
                                        "POST",
                                    },
                                  );

                                const data =
                                  await response.json();

                                if (
                                  data.errorCode ===
                                  "ADULT_AUTH_REQUIRED"
                                ) {
                                  window.location.href =
                                    "/login";
                                  return;
                                }

                                if (
                                  data.errorCode ===
                                  "ADULT_PROVIDER_NOT_CONFIGURED"
                                ) {
                                  alert(
                                    "휴대폰 본인인증 서비스가 아직 연결되지 않았습니다.",
                                  );
                                  return;
                                }

                                if (!response.ok) {
                                  alert(
                                    data.error ||
                                      "성인인증을 시작하지 못했습니다.",
                                  );
                                }
                              } catch (error) {
                                console.error(
                                  "FLIT ADULT START FAILED:",
                                  error,
                                );

                                alert(
                                  "성인인증을 시작하지 못했습니다.",
                                );
                              }
                            }}
                            className="mt-6 h-12 w-full rounded-xl bg-flat-yellow text-sm font-black text-black"
                          >
                            휴대폰으로 성인인증
                          </button>
                        </>
                      )}

                      {adultAccess ===
                        "error" && (
                        <>
                          <p className="mt-3 text-sm text-zinc-400">
                            성인인증 상태를 확인하지 못했습니다.
                          </p>

                          <button
                            type="button"
                            onClick={() => {
                              window.location.reload();
                            }}
                            className="mt-6 h-12 w-full rounded-xl bg-white/10 text-sm font-black text-white"
                          >
                            다시 시도
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

              {flit.isAdult === true && (
                <div className="pointer-events-none absolute left-4 top-4 z-[80]">
                  <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white shadow-lg">
                    🔞 19+
                  </span>
                </div>
              )}

              {/* CENTER PLAY / PAUSE INDICATOR */}
              <div
                className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center transition-opacity duration-300 ${
                  controlsVisible
                    ? "opacity-100"
                    : "opacity-0"
                }`}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-3xl text-white backdrop-blur-sm">
                  {pausedByFlit[
                    flit.id
                  ]
                    ? "▶"
                    : "❚❚"}
                </div>
              </div>

              {/* FLIT PROGRESS */}
              <div
                className={`absolute inset-x-0 bottom-[68px] z-30 px-1 pb-1 transition-opacity duration-300 md:bottom-0 ${
                  controlsVisible
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
              >
                <input
                  onPointerDown={() => {
                    clearControlsTimer();
                    setControlsVisible(
                      true,
                    );
                  }}
                  onPointerUp={() => {
                    showControlsTemporarily();
                  }}
                  type="range"
                  min="0"
                  max={
                    playbackTimes[
                      flit.id
                    ]?.duration || 0
                  }
                  step="0.01"
                  value={
                    playbackTimes[
                      flit.id
                    ]?.current || 0
                  }
                  onChange={(event) => {
                    const nextTime =
                      Number(
                        event.currentTarget
                          .value,
                      );

                    const video =
                      document.querySelector<HTMLVideoElement>(
                        `video[data-flit-id="${flit.id}"]`,
                      );

                    if (
                      !video ||
                      !Number.isFinite(
                        nextTime,
                      )
                    ) {
                      return;
                    }

                    video.currentTime =
                      nextTime;

                    resetPlaybackPoint(
                      flit.id,
                      nextTime,
                    );

                    setPlaybackTimes(
                      (current) => ({
                        ...current,
                        [flit.id]: {
                          current:
                            nextTime,
                          duration:
                            Number.isFinite(
                              video.duration,
                            )
                              ? video.duration
                              : 0,
                        },
                      }),
                    );
                  }}
                  className="h-5 w-full cursor-pointer accent-white"
                  aria-label="FLIT 재생 위치"
                />
              </div>

              {/* TOP GRADIENT */}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-black/65 to-transparent" />

              {/* TOP */}
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-center px-4 pb-10 pt-4 transition-opacity duration-300 ${
                  controlsVisible
                    ? "opacity-100"
                    : "opacity-0"
                }`}
              >
                <span className="text-sm font-black">
                  FLIT
                </span>
              </div>

              {/* BOTTOM GRADIENT */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-64 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

              {/* CREATOR / DESCRIPTION */}
              <div
                className={`absolute bottom-[92px] left-4 right-20 z-20 transition-opacity duration-300 md:bottom-6 ${
                  controlsVisible
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <div
                    className="h-9 w-9 shrink-0 rounded-full border border-white/30 bg-zinc-800 bg-cover bg-center"
                    style={
                      flit.avatarUrl
                        ? {
                            backgroundImage:
                              `url(${flit.avatarUrl})`,
                          }
                        : undefined
                    }
                  >
                    {!flit.avatarUrl && (
                      <div className="flex h-full w-full items-center justify-center text-xs font-black">
                        {creatorName
                          .slice(
                            0,
                            1,
                          )
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <strong className="block truncate text-sm">
                      {
                        creatorHandle
                      }
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="shrink-0 rounded-full bg-flat-yellow px-3 py-1.5 text-[10px] font-black text-black"
                  >
                    팔로우
                  </button>
                </div>

                <p className="text-sm font-semibold">
                  {
                    flit.title
                  }
                </p>

                {flit.description && (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-200">
                    {
                      flit.description
                    }
                  </p>
                )}

                <p className="mt-3 truncate text-xs text-zinc-300">
                  ♫ FLAT LIVE · Original
                </p>
              </div>

              {/* ACTIONS */}
              <div
                className={`absolute bottom-6 right-3 z-20 flex flex-col items-center gap-3 transition-opacity duration-300 ${
                  controlsVisible
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
              >
                <div className="flex flex-col items-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-xl backdrop-blur-sm">
                    👁
                  </span>

                  <span className="mt-1 text-[10px] font-bold">
                    {flit.views}
                  </span>
                </div>

                <button
                  type="button"
                  aria-label="좋아요"
                  onClick={() => {
                    openReactionMenu(
                      flit.id,
                    );
                  }}
                  className="flex flex-col items-center"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-2xl backdrop-blur-sm">
                    {
                      likedIds.has(
                        flit.id,
                      )
                        ? "♥"
                        : "♡"
                    }
                  </span>

                  <span className="mt-1 text-[10px] font-bold">
                    {
                      flit.likes
                    }
                  </span>
                </button>

                {reactionMenuFlitId ===
                  flit.id && (
                  <div className="absolute right-full mr-3 top-10 z-40 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/80 p-2 shadow-xl backdrop-blur-md">

                    <button
                      type="button"
                      onClick={() => {
                        void handleFlitLike(
                          flit.id,
                        );

                        closeReactionMenu();
                      }}
                      className="flex flex-col items-center"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg">
                        {
                          likedIds.has(
                            flit.id,
                          )
                            ? "♥"
                            : "♡"
                        }
                      </span>

                      <span className="mt-1 whitespace-nowrap text-[9px] font-bold">
                        좋아요
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void handleFlitGreat(
                          flit.id,
                        );

                        openReactionMenu(
                          flit.id,
                        );
                      }}
                      className="relative flex flex-col items-center"
                    >
                      {greatFeedback[
                        flit.id
                      ] && (
                        <span className="pointer-events-none absolute -top-5 whitespace-nowrap text-[9px] font-black text-flat-yellow">
                          -10 FLAT
                        </span>
                      )}

                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg">
                        ✨
                      </span>

                      <span className="mt-1 whitespace-nowrap text-[9px] font-bold">
                        멋져요
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void handleFlitBest(
                          flit.id,
                        );

                        openReactionMenu(
                          flit.id,
                        );
                      }}
                      className="relative flex flex-col items-center"
                    >
                      {bestFeedback[
                        flit.id
                      ] && (
                        <span className="pointer-events-none absolute -top-5 whitespace-nowrap text-[9px] font-black text-flat-yellow">
                          -50 FLAT
                        </span>
                      )}

                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg">
                        ★
                      </span>

                      <span className="mt-1 whitespace-nowrap text-[9px] font-bold">
                        최고예요
                      </span>
                    </button>

                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    void openFlitComments(
                      flit,
                    );
                  }}
                  className="flex flex-col items-center"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-xl backdrop-blur-sm">
                    💬
                  </span>

                  <span className="mt-1 text-[10px] font-bold">
                    {
                      flit.comments
                    }
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleFlitShare(
                      flit,
                    );
                  }}
                  className="flex flex-col items-center"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-xl backdrop-blur-sm">
                    ↗
                  </span>

                  <span className="mt-1 text-[10px]">
                    공유
                  </span>
                </button>

                <button
                  type="button"
                  className="flex flex-col items-center"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-xl backdrop-blur-sm">
                    🛍
                  </span>

                  <span className="mt-1 text-[10px]">
                    플핑
                  </span>
                </button>

                <button
                  type="button"
                  aria-label="신고"
                  onClick={() => {
                    setReportTarget(
                      flit,
                    );
                  }}
                  className="flex flex-col items-center"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-xl backdrop-blur-sm">
                    ⚑
                  </span>

                  <span className="mt-1 text-[10px]">
                    신고
                  </span>
                </button>
              </div>
            </section>
          );
        },
      )}

      {flitCommentTarget && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55"
          onClick={() => {
            setFlitCommentTarget(
              null,
            );
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="FLIT 댓글"
            onClick={(event) => {
              event.stopPropagation();
            }}
            className="flex max-h-[72dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#111]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-base font-black text-white">
                  댓글
                </div>

                <div className="mt-0.5 text-xs text-zinc-500">
                  {
                    flitCommentTarget.comments
                  }개
                </div>
              </div>

              <button
                type="button"
                aria-label="댓글창 닫기"
                onClick={() => {
                  setFlitCommentTarget(
                    null,
                  );
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl text-zinc-200"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {flitCommentLoading ? (
                <div className="py-10 text-center text-sm text-zinc-500">
                  댓글을 불러오는 중...
                </div>
              ) : flitComments.length ===
                0 ? (
                <div className="py-10 text-center">
                  <div className="text-sm font-bold text-zinc-300">
                    아직 댓글이 없습니다.
                  </div>

                  <div className="mt-1 text-xs text-zinc-600">
                    첫 댓글을 남겨보세요.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {flitComments.map(
                    (comment) => (
                      <div
                        key={
                          comment.id
                        }
                        className="flex gap-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black text-zinc-300">
                          {(
                            comment.displayName ||
                            comment.username ||
                            "U"
                          ).slice(
                            0,
                            1,
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-bold text-zinc-200">
                              {comment.displayName ||
                                comment.username ||
                                "사용자"}
                            </div>

                            {myUserId &&
                              comment.userId ===
                                myUserId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    void deleteFlitComment(
                                      comment.id,
                                    );
                                  }}
                                  className="shrink-0 text-[11px] font-bold text-zinc-500 transition hover:text-red-400"
                                >
                                  삭제
                                </button>
                              )}
                          </div>

                          <div className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">
                            {
                              comment.text
                            }
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

              {flitCommentError && (
                <div className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {
                    flitCommentError
                  }
                </div>
              )}
            </div>

            <div className="border-t border-white/10 bg-[#111] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <div className="flex items-center gap-2">
                <input
                  value={
                    flitCommentText
                  }
                  onChange={(event) => {
                    setFlitCommentText(
                      event.target.value,
                    );
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                        "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();

                      void submitFlitComment();
                    }
                  }}
                  maxLength={500}
                  placeholder="댓글 추가..."
                  className="h-11 flex-1 rounded-full border border-white/10 bg-[#1a1a1a] px-4 text-sm text-white outline-none placeholder:text-zinc-600"
                />

                <button
                  type="button"
                  disabled={
                    flitCommentSubmitting ||
                    !flitCommentText.trim()
                  }
                  onClick={() => {
                    void submitFlitComment();
                  }}
                  className="rounded-full bg-flat-yellow px-4 py-2.5 text-sm font-black text-black disabled:opacity-40"
                >
                  {flitCommentSubmitting
                    ? "등록 중"
                    : "등록"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {reportTarget && (
        <ReportModal
          open={true}
          onClose={() => {
            setReportTarget(
              null,
            );
          }}
          targetType="FLIT"
          targetId={
            reportTarget.id
          }
          targetOwnerUserId={
            reportTarget.userId
          }
          targetTitle={
            reportTarget.title
          }
        />
      )}
    </main>
  );
}

/* FLATLIVE_SHORTS_SUSPENSE_V2 */
export default function ShortsPage() {
  return (
    <Suspense fallback={null}>
      <ShortsPageContent />
    </Suspense>
  );
}

"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

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

type Props = {
  vodId: string;
  ownerUserId: string;
  title: string;
  initialLikes: number;
  greats: number;
  bests: number;
  comments: number;
};

export default function VodActions({
  vodId,
  ownerUserId,
  title,
  initialLikes,
  greats,
  bests,
  comments,
}: Props) {
  const [likes, setLikes] =
    useState(initialLikes);

  const [liked, setLiked] =
    useState(false);

  const [greatCount, setGreatCount] =
    useState(greats);

  const [greatFeedback, setGreatFeedback] =
    useState(false);

  const [bestFeedback, setBestFeedback] =
    useState(false);

  const [reportOpen, setReportOpen] =
    useState(false);

  const [commentOpen, setCommentOpen] =
    useState(true);

  const [commentItems, setCommentItems] =
    useState<CommentItem[]>([]);

  const [commentText, setCommentText] =
    useState("");

  const [commentCount, setCommentCount] =
    useState(comments);

  const [commentLoading, setCommentLoading] =
    useState(false);

  const [commentSubmitting, setCommentSubmitting] =
    useState(false);

  const [commentError, setCommentError] =
    useState("");

  const [myUserId, setMyUserId] =
    useState("");

  const likingRef =
    useRef(false);

  const greatPendingRef =
    useRef(false);

  const bestPendingRef =
    useRef(false);

  async function handleLike() {
    if (
      likingRef.current
    ) {
      return;
    }

    likingRef.current = true;

    const previousLiked =
      liked;

    const previousLikes =
      likes;

    const optimisticLiked =
      !previousLiked;

    const optimisticLikes =
      optimisticLiked
        ? previousLikes + 1
        : Math.max(
            0,
            previousLikes - 1,
          );

    // 서버 응답 전에 즉시 화면 반영
    setLiked(
      optimisticLiked,
    );

    setLikes(
      optimisticLikes,
    );

    const rollback = () => {
      setLiked(
        previousLiked,
      );

      setLikes(
        previousLikes,
      );
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
                "VOD",
              contentId:
                vodId,
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
          "VOD LIKE ERROR",
          data,
        );

        alert(
          data.error ||
            "좋아요 처리에 실패했습니다.",
        );

        return;
      }

      if (
        typeof data.likes ===
        "number"
      ) {
        setLikes(
          data.likes,
        );
      }

      if (
        typeof data.liked ===
        "boolean"
      ) {
        setLiked(
          data.liked,
        );
      }
    } catch (error) {
      rollback();

      console.error(
        "VOD LIKE NETWORK ERROR",
        error,
      );

      alert(
        "좋아요 처리 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      likingRef.current =
        false;
    }
  }

  async function handleGreat() {
    if (
      greatPendingRef.current
    ) {
      return;
    }

    greatPendingRef.current =
      true;

    const previousGreatCount =
      greatCount;

    // 누르는 즉시 화면 반응
    setGreatCount(
      previousGreatCount + 1,
    );

    setGreatFeedback(true);

    const rollback = () => {
      setGreatCount(
        previousGreatCount,
      );

      setGreatFeedback(false);
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
                "VOD",
              contentId:
                vodId,
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
          "VOD GREAT ERROR",
          data,
        );

        alert(
          data.error ||
            "멋져요 처리에 실패했습니다.",
        );

        return;
      }

      if (
        typeof data.greats ===
        "number"
      ) {
        setGreatCount(
          data.greats,
        );
      }

      window.setTimeout(() => {
        setGreatFeedback(false);
      }, 1200);
    } catch (error) {
      rollback();

      console.error(
        "VOD GREAT NETWORK ERROR",
        error,
      );

      alert(
        "멋져요 처리 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      greatPendingRef.current =
        false;
    }
  }

  async function handleBest() {
    if (
      bestPendingRef.current
    ) {
      return;
    }

    bestPendingRef.current =
      true;

    // 누르는 즉시 화면 반응
    setBestFeedback(true);

    const rollback = () => {
      setBestFeedback(false);
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
                "VOD",
              contentId:
                vodId,
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
          "VOD BEST ERROR",
          data,
        );

        alert(
          data.error ||
            "최고예요 처리에 실패했습니다.",
        );

        return;
      }

      window.setTimeout(() => {
        setBestFeedback(false);
      }, 1200);
    } catch (error) {
      rollback();

      console.error(
        "VOD BEST NETWORK ERROR",
        error,
      );

      alert(
        "최고예요 처리 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      bestPendingRef.current =
        false;
    }
  }

  async function loadCurrentUserForComments() {
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
        "VOD COMMENT CURRENT USER ERROR",
        error,
      );
    }
  }

  async function openComments() {
    setCommentOpen(true);
    setCommentLoading(true);
    setCommentError("");

    try {
      const response = await fetch(
        `/api/comments?contentType=VOD&contentId=${encodeURIComponent(vodId)}`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setCommentError(
          data.error ||
            "댓글을 불러오지 못했습니다.",
        );
        return;
      }

      setCommentItems(
        Array.isArray(data.comments)
          ? data.comments
          : [],
      );

      if (typeof data.count === "number") {
        setCommentCount(data.count);
      }
    } catch (error) {
      console.error(
        "VOD COMMENT GET ERROR",
        error,
      );

      setCommentError(
        "댓글을 불러오는 중 오류가 발생했습니다.",
      );
    } finally {
      setCommentLoading(false);
    }
  }

  async function handleCommentSubmit() {
    const text = commentText.trim();

    if (!text || commentSubmitting) {
      return;
    }

    setCommentSubmitting(true);
    setCommentError("");

    try {
      const response = await fetch(
        "/api/comments",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            contentType: "VOD",
            contentId: vodId,
            text,
          }),
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        alert(
          data.error ||
            "로그인이 필요합니다.",
        );
        return;
      }

      if (!response.ok || !data.success) {
        setCommentError(
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
        setCommentItems(
          (current) => [
            ...current,
            data.comment as CommentItem,
          ],
        );
      }

      if (typeof data.count === "number") {
        setCommentCount(data.count);
      } else {
        setCommentCount(
          (current) => current + 1,
        );
      }

      setCommentText("");
    } catch (error) {
      console.error(
        "VOD COMMENT POST ERROR",
        error,
      );

      setCommentError(
        "댓글 작성 중 오류가 발생했습니다.",
      );
    } finally {
      setCommentSubmitting(false);
    }
  }

  useEffect(() => {
    void loadCurrentUserForComments();
    void openComments();
    // VOD가 바뀌면 댓글을 다시 불러옵니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vodId]);

  async function handleCommentDelete(
    commentId: string,
  ) {
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

      setCommentItems(
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
        setCommentCount(
          data.count,
        );
      }
    } catch (error) {
      console.error(
        "VOD COMMENT DELETE ERROR",
        error,
      );

      alert(
        "댓글 삭제 중 오류가 발생했습니다.",
      );
    }
  }

  async function handleVodShare() {
    const url =
      window.location.href;

    try {
      if (
        typeof navigator.share ===
        "function"
      ) {
        await navigator.share({
          title:
            title ||
            "FLATLIVE VOD",
          url,
        });

        return;
      }

      await navigator.clipboard.writeText(
        url,
      );

      alert(
        "공유 링크가 복사되었습니다.",
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "VOD SHARE ERROR",
        error,
      );

      try {
        await navigator.clipboard.writeText(
          url,
        );

        alert(
          "공유 링크가 복사되었습니다.",
        );
      } catch {
        alert(
          "공유에 실패했습니다.",
        );
      }
    }
  }

  const actions = [
    {
      icon: liked ? "♥" : "♡",
      label: "좋아요",
      count: String(likes),
      onClick: handleLike,
    },
    {
      icon: "✦",
      label: "멋져요",
      count: "",
      onClick: handleGreat,
    },
    {
      icon: "★",
      label: "최고예요",
      count: "",
      onClick: handleBest,
    },
    {
      icon: "💬",
      label: "댓글",
      count: String(commentCount),
      onClick: () => {
        void openComments();
      },
    },
    {
      icon: "↗",
      label: "공유",
      count: "",
      onClick: () => {
        void handleVodShare();
      },
    },
    {
      icon: "🛍",
      label: "플핑",
      count: "",
      onClick: undefined,
    },
    {
      icon: "⚑",
      label: "신고",
      count: "",
      onClick: () => {
        setReportOpen(true);
      },
    },
  ];

  return (
    <>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 pt-6 [scrollbar-width:none]">
        {actions.map((action) => (
          <button
          key={action.label}
          type="button"
          onClick={
            action.onClick
          }
          className="relative flex shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-[#171717] px-4 py-2.5 text-sm font-bold text-zinc-200 transition hover:bg-white/10"
        >
          {action.label ===
            "멋져요" &&
            greatFeedback && (
              <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black text-flat-yellow">
                -10 FLAT
              </span>
            )}
          {action.label ===
            "최고예요" &&
            bestFeedback && (
              <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black text-flat-yellow">
                -50 FLAT
              </span>
            )}
          <span className="text-base">
            {action.icon}
          </span>

          <span>
            {action.label}
          </span>

          {action.count !== "" && (
            <span className="text-xs text-zinc-500">
              {action.count}
            </span>
          )}
          </button>
        ))}
      </div>

      {commentOpen && (
        <div
          className="mt-4 w-full"
        >
          <div
            onClick={(event) => {
              event.stopPropagation();
            }}
            className="flex max-h-[520px] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="font-black text-white">
                  댓글
                </div>

                <div className="text-xs text-zinc-500">
                  {commentCount}개
                </div>
              </div>

              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-zinc-400">
                댓글
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {commentLoading ? (
                <div className="py-10 text-center text-sm text-zinc-500">
                  댓글 불러오는 중...
                </div>
              ) : commentItems.length === 0 ? (
                <div className="py-10 text-center text-sm text-zinc-500">
                  아직 댓글이 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {commentItems.map(
                    (comment) => (
                      <div
                        key={comment.id}
                        className="flex gap-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
                          {(
                            comment.displayName ||
                            comment.username ||
                            "U"
                          ).slice(0, 1)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-bold text-zinc-200">
                              {comment.displayName ||
                                comment.username ||
                                "사용자"}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                void handleCommentDelete(
                                  comment.id,
                                );
                              }}
                              className="shrink-0 text-[11px] font-bold text-zinc-500 transition hover:text-red-400"
                            >
                              삭제
                            </button>
                          </div>

                          <div className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-300">
                            {comment.text}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

              {commentError && (
                <div className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {commentError}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(event) => {
                    setCommentText(
                      event.target.value,
                    );
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter"
                    ) {
                      event.preventDefault();
                      void handleCommentSubmit();
                    }
                  }}
                  maxLength={500}
                  placeholder="댓글을 입력하세요"
                  className="h-11 flex-1 rounded-xl border border-white/10 bg-[#1a1a1a] px-4 text-sm text-white outline-none"
                />

                <button
                  type="button"
                  disabled={
                    commentSubmitting ||
                    !commentText.trim()
                  }
                  onClick={() => {
                    void handleCommentSubmit();
                  }}
                  className="rounded-xl bg-flat-yellow px-4 text-sm font-black text-black disabled:opacity-40"
                >
                  {commentSubmitting
                    ? "등록 중"
                    : "등록"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ReportModal
        open={reportOpen}
        onClose={() => {
          setReportOpen(false);
        }}
        targetType="VOD"
        targetId={vodId}
        targetOwnerUserId={ownerUserId}
        targetTitle={title}
      />
    </>
  );
}

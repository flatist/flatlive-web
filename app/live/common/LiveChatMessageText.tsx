"use client";

type Props = {
  nickname?: string;
  username?: string;
  message: string;
  messageType?: "CHAT" | "RECOMMEND";
  compact?: boolean;
};

export default function LiveChatMessageText({
  nickname,
  username,
  message,
  messageType,
  compact = false,
}: Props) {
  const displayName =
    nickname?.trim() ||
    username?.trim() ||
    "시청자";

  const isRecommend =
    messageType === "RECOMMEND";

  if (isRecommend) {
    return (
      <span
        className={[
          "inline-flex w-fit max-w-full items-center rounded-lg border border-yellow-300/30 bg-yellow-400/15 font-black text-yellow-200",
          compact
            ? "px-2 py-1 text-[12px]"
            : "px-2.5 py-1.5 text-[13px]",
        ].join(" ")}
        style={{
          letterSpacing: "-0.01em",
          textShadow:
            "0 1px 2px rgba(0,0,0,.85)",
        }}
      >
        <span className="mr-1 text-yellow-300">
          ♡
        </span>

        <span>
          {displayName}님 추천하셨습니다.
        </span>
      </span>
    );
  }

  return (
    <>
      <strong className="mr-1.5 font-black text-flat-yellow">
        {displayName}
      </strong>

      <span className="break-words font-medium text-white">
        {message}
      </span>
    </>
  );
}

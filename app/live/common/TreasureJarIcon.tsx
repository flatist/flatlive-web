"use client";

type Props = {
  portal?: boolean;
  opened?: boolean;
  size?: number;
  className?: string;
};

export default function TreasureJarIcon({
  portal = false,
  opened = false,
  size = 48,
  className = "",
}: Props) {
  const closedSrc = portal
    ? "/live/portal-jar-closed.png"
    : "/live/treasure-jar-closed.png";

  const openSrc = portal
    ? "/live/portal-jar-open.png"
    : "/live/treasure-jar-open.png";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src={closedSrc}
        alt=""
        draggable={false}
        className={`absolute inset-0 h-full w-full select-none object-contain transition-all duration-300 ease-out ${
          opened
            ? "opacity-0"
            : "opacity-100"
        }`}
      />

      <img
        src={openSrc}
        alt=""
        draggable={false}
        className={`absolute inset-0 h-full w-full select-none object-contain transition-all duration-300 ease-out ${
          opened
            ? "opacity-100"
            : "opacity-0"
        }`}
      />
    </span>
  );
}

type Props = {
  label?: string | null;
  className?: string;
};

function getLevelNumber(label: string) {
  const match = label.match(/Lv\.?\s*(\d+)/i);
  const level = match ? Number(match[1]) : 1;

  if (!Number.isFinite(level)) {
    return 1;
  }

  return Math.max(1, Math.floor(level));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getBadge(label: string) {
  const isCreator = label.startsWith("FLATIST");
  const level = getLevelNumber(label);

  if (isCreator) {
    const badgeNumber = clamp(level, 1, 10);

    return {
      src: `/badges/creator/creator-${pad(badgeNumber)}.png`,
      levelText: `Lv.${level}`,
      alt: `진행자 Lv.${level}`,
    };
  }

  const badgeNumber = clamp(Math.ceil(level / 10), 1, 10);

  return {
    src: `/badges/viewer/viewer-${pad(badgeNumber)}.png`,
    levelText: `Lv.${level}`,
    alt: `시청자 Lv.${level}`,
  };
}

export default function LiveLevelBadge({
  label,
  className = "",
}: Props) {
  if (!label) {
    return null;
  }

  const badge = getBadge(label);

  return (
    <span
      className={[
        "mr-1.5 inline-flex w-[32px] shrink-0 flex-col items-center justify-center align-middle leading-none",
        className,
      ].join(" ")}
      title={badge.alt}
      aria-label={badge.alt}
    >
      <img
        src={badge.src}
        alt={badge.alt}
        className="h-[26px] w-[26px] object-contain drop-shadow-[0_0_5px_rgba(255,215,0,0.24)]"
        draggable={false}
      />

      <span className="mt-0.5 rounded-full border border-white/10 bg-black/45 px-1 py-[1px] text-[7px] font-black leading-none tracking-[-0.04em] text-white/90 shadow-sm">
        {badge.levelText}
      </span>
    </span>
  );
}

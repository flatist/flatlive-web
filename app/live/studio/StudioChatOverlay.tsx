"use client";

// FLATLIVE_STUDIO_COMMON_CHAT_WRAPPER

import MobileDraggableChatOverlay from "../common/MobileDraggableChatOverlay";

import type {
  StudioVideoContentRect,
} from "./useStudioVideoContentRect";

type Position =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

type Size =
  | "small"
  | "medium"
  | "large";

type Count =
  | 3
  | 5
  | 10;

type Opacity =
  | 50
  | 70
  | 90;

type ChatMessage = {
  id: string;
  viewerId?: string;
  userId?: string;
  username?: string;
  nickname?: string;
  message: string;
  isBroadcaster?: boolean;
  isManager?: boolean;
  levelLabel?: string | null;
  loungeBadge?: string | null;
  nicknameTone?: "DEFAULT" | "FAN" | "VIP" | "BROADCASTER";
};

type Props = {
  enabled: boolean;

  roomId: string;

  messages:
    ChatMessage[];

  position?: Position;

  size: Size;

  count: Count;

  opacity: Opacity;

  videoRect:
    StudioVideoContentRect |
    null;

  x: number;

  y: number;

  onPositionChange: (
    x: number,
    y: number,
  ) => void;
};

export default function StudioChatOverlay({
  enabled,
  roomId,
  messages,
  size,
  count,
  opacity,
  videoRect,
  x,
  y,
  onPositionChange,
}: Props) {
  if (
    !roomId ||
    !enabled ||
    messages.length === 0
  ) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute z-30"
      style={
        videoRect
          ? {
              left:
                videoRect.left,

              top:
                videoRect.top,

              width:
                videoRect.width,

              height:
                videoRect.height,
            }
          : {
              inset: 0,
            }
      }
    >
      <MobileDraggableChatOverlay
        roomId={roomId}
        actionMode="studio"
        messages={
          messages
        }
        size={
          size
        }
        count={
          count
        }
        opacity={
          opacity
        }
        x={
          x
        }
        y={
          y
        }
        draggable={
          true
        }
        scrollable={
          false
        }
        positioning="absolute"
        onPositionChange={
          onPositionChange
        }
      />
    </div>
  );
}

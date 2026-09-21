"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type Props = {
  contentType:
    | "FLIT"
    | "VOD";
  contentId: string;
};

type DeleteResponse = {
  success?: boolean;
  error?: string;
  errorCode?: string;
  traceId?: string;
};

export default function DeleteContentButton({
  contentType,
  contentId,
}: Props) {
  const router =
    useRouter();

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  async function handleDelete() {
    if (deleting) {
      return;
    }

    const confirmed =
      window.confirm(
        "정말 삭제하시겠습니까?\n\n삭제한 영상은 복구할 수 없습니다.",
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const isFlit =
        contentType ===
        "FLIT";

      const response =
        await fetch(
          isFlit
            ? "/api/flit/delete"
            : "/api/vod/delete",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              isFlit
                ? {
                    flitId:
                      contentId,
                  }
                : {
                    vodId:
                      contentId,
                  },
            ),
          },
        );

      let data:
        DeleteResponse = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (
        !response.ok ||
        !data.success
      ) {
        const message =
          data.error ||
          "영상 삭제에 실패했습니다.";

        const detail = [
          data.errorCode
            ? `오류코드: ${data.errorCode}`
            : "",
          data.traceId
            ? `Trace ID: ${data.traceId}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");

        window.alert(
          detail
            ? `${message}\n\n${detail}`
            : message,
        );

        return;
      }

      router.refresh();
    } catch {
      window.alert(
        "영상 삭제 요청 중 오류가 발생했습니다.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={
        handleDelete
      }
      disabled={
        deleting
      }
      className="shrink-0 text-xs font-bold text-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {deleting
        ? "삭제 중..."
        : "삭제"}
    </button>
  );
}

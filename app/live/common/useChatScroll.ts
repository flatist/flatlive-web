"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export function useChatScroll(
  itemCount: number,
) {
  const scrollRef =
    useRef<HTMLDivElement>(null);

  const pinnedRef =
    useRef(true);

  const [
    showLatestButton,
    setShowLatestButton,
  ] = useState(false);

  const checkPosition =
    useCallback(() => {
      const box =
        scrollRef.current;

      if (!box) {
        return;
      }

      const distanceFromBottom =
        box.scrollHeight -
        box.scrollTop -
        box.clientHeight;

      const atBottom =
        distanceFromBottom < 32;

      pinnedRef.current =
        atBottom;

      setShowLatestButton(
        !atBottom,
      );
    }, []);

  const scrollToLatest =
    useCallback(
      (
        behavior:
          | ScrollBehavior
          | "auto" = "smooth",
      ) => {
        const box =
          scrollRef.current;

        if (!box) {
          return;
        }

        box.scrollTo({
          top:
            box.scrollHeight,
          behavior,
        });

        pinnedRef.current =
          true;

        setShowLatestButton(
          false,
        );
      },
      [],
    );

  useEffect(() => {
    const box =
      scrollRef.current;

    if (!box) {
      return;
    }

    const frame =
      window.requestAnimationFrame(
        () => {
          if (
            pinnedRef.current
          ) {
            box.scrollTop =
              box.scrollHeight;

            setShowLatestButton(
              false,
            );
          } else {
            checkPosition();
          }
        },
      );

    return () => {
      window.cancelAnimationFrame(
        frame,
      );
    };
  }, [
    itemCount,
    checkPosition,
  ]);

  const onScroll =
    useCallback(() => {
      checkPosition();
    }, [checkPosition]);

  return {
    scrollRef,
    onScroll,
    scrollToLatest,
    showLatestButton,
  };
}

"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

type ForbiddenWord = {
  id: string;
  word: string;
  createdAt: string;
};

export default function LiveChatSettingsPage() {
  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    autoBlockEnabled,
    setAutoBlockEnabled,
  ] = useState(true);

  const [
    words,
    setWords,
  ] =
    useState<ForbiddenWord[]>([]);

  const [
    input,
    setInput,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  async function loadSettings() {
    try {
      setLoading(true);
      setMessage("");

      const response =
        await fetch(
          "/api/profile/live-chat-settings",
          {
            cache: "no-store",
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "설정을 불러오지 못했습니다.",
        );
      }

      setAutoBlockEnabled(
        data.autoBlockEnabled !== false,
      );

      setWords(
        Array.isArray(data.words)
          ? data.words
          : [],
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "설정을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function postAction(
    body: Record<string, unknown>,
  ) {
    const response =
      await fetch(
        "/api/profile/live-chat-settings",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
        },
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "설정 저장에 실패했습니다.",
      );
    }

    setAutoBlockEnabled(
      data.autoBlockEnabled !== false,
    );

    setWords(
      Array.isArray(data.words)
        ? data.words
        : [],
    );
  }

  async function toggleAutoBlock() {
    if (saving) {
      return;
    }

    const next =
      !autoBlockEnabled;

    try {
      setSaving(true);
      setMessage("");

      await postAction({
        action: "set-auto-block",
        enabled: next,
      });

      setMessage(
        next
          ? "욕설·비속어 자동차단을 켰습니다."
          : "욕설·비속어 자동차단을 껐습니다.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "설정 저장에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function addWord(
    event: FormEvent,
  ) {
    event.preventDefault();

    const word =
      input.trim();

    if (!word || saving) {
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      await postAction({
        action: "add-word",
        word,
      });

      setInput("");
      setMessage(
        "금지어를 추가했습니다.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "금지어 추가에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteWord(
    item: ForbiddenWord,
  ) {
    if (saving) {
      return;
    }

    if (
      !window.confirm(
        `"${item.word}" 금지어를 삭제할까요?`,
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      await postAction({
        action: "delete-word",
        id: item.id,
      });

      setMessage(
        "금지어를 삭제했습니다.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "금지어 삭제에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/profile"
          className="text-xs font-bold text-zinc-500 hover:text-white"
        >
          ← 마이페이지
        </Link>

        <div className="mt-5">
          <p className="text-xs font-black text-yellow-400">
            LIVE 관리
          </p>

          <h1 className="mt-2 text-2xl font-black">
            채팅 관리
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            방송 전에 금지어와 욕설·비속어
            자동차단을 설정합니다. 저장한 설정은
            다음 LIVE에도 계속 적용됩니다.
          </p>
        </div>

        {loading ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-zinc-950 p-6 text-sm text-zinc-500">
            설정을 불러오는 중입니다.
          </div>
        ) : (
          <>
            <section className="mt-8 rounded-3xl border border-white/[0.08] bg-zinc-950 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black">
                    욕설·비속어 자동차단
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    욕설과 기본적인 우회 표현이
                    포함된 채팅을 자동으로 막습니다.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    void toggleAutoBlock();
                  }}
                  className={[
                    "shrink-0 rounded-full px-4 py-2 text-xs font-black transition disabled:opacity-50",
                    autoBlockEnabled
                      ? "bg-yellow-400 text-black"
                      : "bg-zinc-800 text-zinc-400",
                  ].join(" ")}
                >
                  {autoBlockEnabled
                    ? "ON"
                    : "OFF"}
                </button>
              </div>
            </section>

            <section className="mt-4 rounded-3xl border border-white/[0.08] bg-zinc-950 p-5">
              <h2 className="text-base font-black">
                내 금지어
              </h2>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                내가 추가한 단어가 포함된 채팅은
                서버에서 전송되지 않습니다.
              </p>

              <form
                onSubmit={addWord}
                className="mt-5 flex gap-2"
              >
                <input
                  type="text"
                  maxLength={40}
                  value={input}
                  onChange={(event) => {
                    setInput(
                      event.target.value,
                    );
                  }}
                  placeholder="금지할 단어 입력"
                  className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none focus:border-yellow-400"
                />

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !input.trim()
                  }
                  className="rounded-xl bg-white px-4 text-xs font-black text-black disabled:opacity-40"
                >
                  추가
                </button>
              </form>

              <div className="mt-5 space-y-2">
                {words.length === 0 ? (
                  <div className="rounded-xl bg-black px-4 py-6 text-center text-xs text-zinc-600">
                    등록한 금지어가 없습니다.
                  </div>
                ) : (
                  words.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-black px-4 py-3"
                    >
                      <div className="min-w-0 truncate text-sm font-bold text-zinc-200">
                        {item.word}
                      </div>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          void deleteWord(
                            item,
                          );
                        }}
                        className="shrink-0 rounded-lg bg-red-500/15 px-3 py-1.5 text-[11px] font-black text-red-400 disabled:opacity-40"
                      >
                        삭제
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        {message && (
          <div className="mt-4 rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-xs text-zinc-300">
            {message}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-yellow-400/15 bg-yellow-400/5 p-4 text-xs leading-5 text-zinc-400">
          금지어는 공백이나 일부 특수문자를
          끼워 넣은 기본 우회도 검사합니다.
          차단된 사용자는 강퇴되지 않고 해당
          메시지만 전송되지 않습니다.
        </div>
      </div>
    </main>
  );
}

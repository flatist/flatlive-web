import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import DeleteContentButton from "./DeleteContentButton";
import ContentVideoPreview from "./ContentVideoPreview";

import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { readFlits } from "@/lib/flit/flit-store";
import { readVods } from "@/lib/vod/vod-store";


export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR");
}

export default async function StudioContentPage() {
  const cookieStore = await cookies();

  const sessionToken =
    cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  const snapshot =
    await new AuthService().getCurrentUserSnapshot(
      sessionToken,
    );

  if (!snapshot) {
    redirect("/login");
  }

  const [allFlits, allVods] = await Promise.all([
    readFlits(),
    readVods(),
  ]);

  const myFlits = allFlits
    .filter(
      (item) => item.userId === snapshot.userId,
    )
    .sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );

  const myVods = allVods
    .filter(
      (item) => item.userId === snapshot.userId,
    )
    .sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );

  const totalViews =
    myFlits.reduce(
      (sum, item) => sum + item.views,
      0,
    ) +
    myVods.reduce(
      (sum, item) => sum + item.views,
      0,
    );

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-widest text-flat-yellow">
              CREATOR STUDIO
            </p>

            <h1 className="mt-2 text-3xl font-black">
              내 콘텐츠 관리
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              내가 업로드한 FLIT과 VOD만 표시됩니다.
            </p>
          </div>

          <Link
            href="/studio"
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold hover:bg-white hover:text-black"
          >
            스튜디오로 돌아가기
          </Link>
        </div>

        <section className="mt-8 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-4">
            <div className="text-xs text-zinc-500">
              FLIT
            </div>

            <div className="mt-2 text-2xl font-black">
              {myFlits.length}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-4">
            <div className="text-xs text-zinc-500">
              VOD
            </div>

            <div className="mt-2 text-2xl font-black">
              {myVods.length}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-4">
            <div className="text-xs text-zinc-500">
              총 조회수
            </div>

            <div className="mt-2 text-2xl font-black">
              {totalViews.toLocaleString("ko-KR")}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">
              내 FLIT
            </h2>

            <Link
              href="/shorts/upload"
              className="text-xs font-black text-flat-yellow"
            >
              FLIT 올리기 →
            </Link>
          </div>

          {myFlits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-600">
              아직 업로드한 FLIT이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {myFlits.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-4"
                >
                  <div className="flex items-start gap-4">
                    <ContentVideoPreview
                      videoUrl={item.videoUrl}
                      type="FLIT"
                      isAdult={item.isAdult === true}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-flat-yellow">
                        FLIT
                      </div>

                      <h3 className="mt-1 truncate font-black">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-xs text-zinc-600">
                        {formatDate(item.createdAt)}
                      </p>

                      <div className="mt-3 flex items-center gap-3">
                        <Link
                          href="/shorts"
                          className="text-xs font-bold text-zinc-400 hover:text-white"
                        >
                          보기 →
                        </Link>

                        <DeleteContentButton
                          contentType="FLIT"
                          contentId={item.id}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-sm font-black">
                        {item.views}
                      </div>
                      <div className="text-[10px] text-zinc-600">
                        조회
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-black">
                        {item.likes}
                      </div>
                      <div className="text-[10px] text-zinc-600">
                        좋아요
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-black">
                        {item.greats}
                      </div>
                      <div className="text-[10px] text-zinc-600">
                        멋져요
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-black">
                        {item.bests}
                      </div>
                      <div className="text-[10px] text-zinc-600">
                        최고예요
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">
              내 VOD
            </h2>

            <Link
              href="/vod/upload"
              className="text-xs font-black text-flat-yellow"
            >
              VOD 올리기 →
            </Link>
          </div>

          {myVods.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-600">
              아직 업로드한 VOD가 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {myVods.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-4"
                >
                  <div className="flex items-start gap-4">
                    <ContentVideoPreview
                      videoUrl={item.videoUrl}
                      type="VOD"
                      isAdult={item.isAdult === true}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-flat-yellow">
                        VOD
                      </div>

                      <h3 className="mt-1 truncate font-black">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-xs text-zinc-600">
                        {formatDate(item.createdAt)}
                      </p>

                      <div className="mt-3 flex items-center gap-3">
                        <Link
                          href={`/vod/${encodeURIComponent(
                            item.id,
                          )}`}
                          className="text-xs font-bold text-zinc-400 hover:text-white"
                        >
                          보기 →
                        </Link>

                        <DeleteContentButton
                          contentType="VOD"
                          contentId={item.id}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-sm font-black">
                        {item.views}
                      </div>
                      <div className="text-[10px] text-zinc-600">
                        조회
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-black">
                        {item.likes}
                      </div>
                      <div className="text-[10px] text-zinc-600">
                        좋아요
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-black">
                        {item.greats}
                      </div>
                      <div className="text-[10px] text-zinc-600">
                        멋져요
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-black">
                        {item.bests}
                      </div>
                      <div className="text-[10px] text-zinc-600">
                        최고예요
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

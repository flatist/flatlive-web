import Link from "next/link";
import { notFound } from "next/navigation";
import { readVods } from "@/lib/vod/vod-store";
import VodPlayer from "./VodPlayer";
import VodActions from "./VodActions";

export const dynamic = "force-dynamic";

export default async function VodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const vods = await readVods();
  const vod = vods.find((item) => item.id === id);

  if (!vod) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#090909] pb-24 text-white md:pb-12 md:pt-20">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <div className="mb-5">
          <Link
            href="/vod"
            className="text-sm font-bold text-zinc-400 hover:text-white"
          >
            ← VOD 목록
          </Link>
        </div>

        <section>
          <VodPlayer
            vodId={vod.id}
            videoUrl={vod.videoUrl}
            initialViews={vod.views}
            isAdult={vod.isAdult === true}
          />

          <VodActions
            vodId={vod.id}
            ownerUserId={vod.userId}
            title={vod.title}
            initialLikes={vod.likes}
            greats={vod.greats}
            bests={vod.bests}
            comments={vod.comments}
          />

          <div className="mt-5">
            <h1 className="text-2xl font-black tracking-[-0.03em]">
              {vod.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
              <strong className="text-white">
                {vod.displayName ||
                  vod.username ||
                  "FLATIST"}
              </strong>



              <span>
                {new Date(vod.createdAt).toLocaleDateString(
                  "ko-KR",
                )}
              </span>
            </div>

            {vod.description && (
              <div className="mt-5 rounded-[18px] border border-white/[0.07] bg-[#111] p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                  {vod.description}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";
import { readVods } from "@/lib/vod/vod-store";
import VodSearchGrid from "./VodSearchGrid";

export const dynamic = "force-dynamic";

export default async function VodPage() {
  const vods = (await readVods()).filter(
    (item) => item.visibility === "public",
  );

  return (
    <main className="min-h-screen bg-[#090909] px-4 pb-24 pt-6 text-white md:px-6 md:pt-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-[-0.04em]">
            VOD
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            가로형 영상 콘텐츠
          </p>
        </div>

        <VodSearchGrid vods={vods} />
      </div>
    </main>
  );
}

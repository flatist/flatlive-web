import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { FollowButton } from "@/components/social/FollowButton";
import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { ProfileService } from "@/lib/profile/profile-service";
import { HybridUserRepository } from "@/lib/repositories/hybrid-user-repository";
import { SocialService } from "@/lib/social/social-service";

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await new HybridUserRepository().findByUsername(decodeURIComponent(username));
  if (!user) notFound();

  const profile = await new ProfileService().getByUserId(user.id);
  if (profile && profile.isPublic === false) notFound();

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const viewerUserId = token ? parseSessionToken(token)?.userId ?? null : null;
  const social = new SocialService();
  const [stats, initialFollowing] = await Promise.all([
    social.getStats(user.id),
    viewerUserId && viewerUserId !== user.id ? social.isFollowing(viewerUserId, user.id) : Promise.resolve(false),
  ]);

  const name = profile?.nickname || user.displayName || user.username;

  return (
    <main className="min-h-screen bg-black px-4 pb-24 pt-8 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-4xl">
        <section className="flex items-start gap-5">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-zinc-800">
            {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="프로필" className="h-full w-full object-cover" /> : null}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black">{name}</h1>
            <p className="mt-1 text-sm text-zinc-500">@{user.username}</p>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">{profile?.bio || "FLAT LIVE 사용자"}</p>
            {viewerUserId && viewerUserId !== user.id ? <FollowButton targetUserId={user.id} initialFollowing={initialFollowing} /> : null}
          </div>
        </section>

        <section className="mt-8 grid max-w-md grid-cols-2 gap-3">
          <div className="rounded-2xl bg-zinc-950 p-4"><p className="text-xs text-zinc-500">팔로워</p><p className="mt-1 text-xl font-black">{stats.followers}</p></div>
          <div className="rounded-2xl bg-zinc-950 p-4"><p className="text-xs text-zinc-500">팔로잉</p><p className="mt-1 text-xl font-black">{stats.following}</p></div>
        </section>

        <div className="mt-8 flex gap-6 border-b border-white/10 pb-3 text-sm font-bold">
          <button>영상</button>
          <button className="text-zinc-500">라이브</button>
          <button className="text-zinc-500">플핑</button>
          <button className="text-zinc-500">라운지</button>
        </div>
      </div>
    </main>
  );
}

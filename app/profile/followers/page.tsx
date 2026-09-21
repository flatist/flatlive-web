import {
  cookies,
} from "next/headers";
import {
  redirect,
} from "next/navigation";

import FollowTabsClient from "./FollowTabsClient";

import type {
  FollowUserListItem,
} from "@/components/social/FollowUserList";

import {
  AuthService,
} from "@/lib/auth/auth-service";

import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  ProfileService,
} from "@/lib/profile/profile-service";

import {
  HybridUserRepository,
} from "@/lib/repositories/hybrid-user-repository";

import {
  SocialService,
} from "@/lib/social/social-service";

async function createItems(
  ids: string[],
  users:
    HybridUserRepository,
  profiles:
    ProfileService,
) {
  return (
    await Promise.all(
      ids.map(
        async (
          userId,
        ): Promise<
          FollowUserListItem | null
        > => {
          const user =
            await users.findById(
              userId,
            );

          if (!user) {
            return null;
          }

          const profile =
            await profiles.getByUserId(
              userId,
            );

          return {
            userId,

            username:
              user.username,

            displayName:
              user.displayName,

            nickname:
              profile?.nickname,

            avatarUrl:
              profile?.avatarUrl,

            bio:
              profile?.bio,
          };
        },
      ),
    )
  ).filter(
    (
      item,
    ): item is FollowUserListItem =>
      item !== null,
  );
}

export default async function FollowersPage() {
  const token =
    (
      await cookies()
    ).get(
      SESSION_COOKIE_NAME,
    )?.value;

  if (!token) {
    redirect(
      "/login",
    );
  }

  const snapshot =
    await new AuthService()
      .getCurrentUserSnapshot(
        token,
      );

  if (!snapshot) {
    redirect(
      "/login",
    );
  }

  const socialService =
    new SocialService();

  const [
    followerIds,
    followingIds,
  ] =
    await Promise.all([
      socialService
        .listFollowerUserIds(
          snapshot.userId,
        ),

      socialService
        .listFollowingUserIds(
          snapshot.userId,
        ),
    ]);

  const users =
    new HybridUserRepository();

  const profiles =
    new ProfileService();

  const [
    followers,
    following,
  ] =
    await Promise.all([
      createItems(
        followerIds,
        users,
        profiles,
      ),

      createItems(
        followingIds,
        users,
        profiles,
      ),
    ]);

  return (
    <main className="min-h-screen bg-black px-4 pb-24 pt-6 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-2xl">
        <FollowTabsClient
          followers={
            followers
          }
          following={
            following
          }
        />
      </div>
    </main>
  );
}

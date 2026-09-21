export type FollowRecord = {
  id: string;
  followerUserId: string;
  followingUserId: string;
  createdAt: string;
};

export type SocialStats = {
  followers: number;
  following: number;
};

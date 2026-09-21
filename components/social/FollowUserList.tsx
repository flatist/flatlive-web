import Link from "next/link";

export type FollowUserListItem = {
  userId: string;
  username: string;
  displayName: string;
  nickname?: string;
  avatarUrl?: string;
  bio?: string;
};

export function FollowUserList({ items, emptyText }: { items: FollowUserListItem[]; emptyText: string }) {
  if (items.length === 0) {
    return <div className="rounded-2xl border border-white/10 bg-zinc-950 p-8 text-center text-sm text-zinc-500">{emptyText}</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.userId}
          href={`/u/${encodeURIComponent(item.username)}`}
          className="flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:bg-zinc-900"
        >
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-800">
            {item.avatarUrl ? <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{item.nickname || item.displayName || item.username}</p>
            <p className="truncate text-sm text-zinc-500">@{item.username}</p>
            {item.bio ? <p className="mt-1 truncate text-xs text-zinc-600">{item.bio}</p> : null}
          </div>
          <span className="text-sm text-zinc-600">›</span>
        </Link>
      ))}
    </div>
  );
}

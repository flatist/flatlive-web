"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

type ProviderSummary = {
  provider: string;
  loginIdentifier: string;
  verified: boolean;
  providerUserId?: string;
};

type ServiceAccessSummary = {
  service: string;
  status: string;
  joinedAt?: string | null;
};

type UserSummary = {
  userId: string;
  username: string;
  email: string;
  displayName: string;
};

export function UnifiedUserStatusCard({
  user,
  providers,
  serviceAccess,
}: {
  user: UserSummary;
  providers: ProviderSummary[];
  serviceAccess?: ServiceAccessSummary | null;
}) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  const formatDate = (value?: string | null) => {
    if (!value) {
      return "없음";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "없음";
    }

    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  };

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Unified account</p>
          <h2 className="mt-2 text-2xl font-black text-white">{user.displayName || user.username}</h2>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-white/15 bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-zinc-800"
        >
          로그아웃
        </button>
      </div>

      <div className="mt-6 grid gap-3 text-sm text-zinc-300 md:grid-cols-2">
        <div className="rounded-xl bg-zinc-900/80 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Username</p>
          <p className="mt-2 font-medium text-white">{user.username}</p>
        </div>
        <div className="rounded-xl bg-zinc-900/80 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Email</p>
          <p className="mt-2 break-all font-medium text-white">{user.email}</p>
        </div>
        <div className="rounded-xl bg-zinc-900/80 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Display name</p>
          <p className="mt-2 font-medium text-white">{user.displayName}</p>
        </div>
        <div className="rounded-xl bg-zinc-900/80 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">User ID</p>
          <p className="mt-2 break-all font-medium text-white">{user.userId}</p>
        </div>
        <div className="rounded-xl bg-zinc-900/80 p-3 md:col-span-2">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Connected login methods</p>
          <p className="mt-2 font-medium text-white">
            {providers.map((provider) => provider.provider).join(", ") || "없음"}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-900/80 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Joined service</p>
          <p className="mt-2 font-medium text-flat-yellow">
            {serviceAccess?.service ?? "없음"}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-900/80 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Joined date</p>
          <p className="mt-2 font-medium text-white">{formatDate(serviceAccess?.joinedAt)}</p>
        </div>
      </div>
    </section>
  );
}

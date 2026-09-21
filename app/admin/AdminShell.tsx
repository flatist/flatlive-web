"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type MenuItem = {
  href: string;
  label: string;
  code: string;
  group: string;
};

export default function AdminShell({
  role,
  menus,
  children,
}: {
  role: string;
  menus: MenuItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const groups = Array.from(new Set(menus.map((item) => item.group)));

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-zinc-950">
      <div className="mx-auto flex max-w-[1680px] gap-5 px-4 pb-10 pt-20 md:px-6">
        <aside className="hidden w-[250px] shrink-0 lg:block">
          <div className="sticky top-20 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-5 py-5">
              <div className="text-[10px] font-black tracking-[0.22em] text-zinc-400">FLATLIVE</div>
              <div className="mt-1 text-xl font-black">ADMIN</div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-bold text-zinc-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {role}
              </div>
            </div>

            <nav className="max-h-[calc(100dvh-190px)] overflow-y-auto p-3">
              <Link
                href="/admin"
                className={`mb-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-black transition ${
                  pathname === "/admin"
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100/15 text-[10px]">DB</span>
                대시보드
              </Link>

              {groups.map((group) => (
                <div key={group} className="mt-4 first:mt-2">
                  <div className="px-3 pb-1 text-[10px] font-black tracking-[0.14em] text-zinc-400">{group}</div>
                  {menus.filter((item) => item.group === group).map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                          active
                            ? "bg-zinc-950 text-white"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                        }`}
                      >
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-black ${active ? "bg-white/10" : "bg-zinc-100 text-zinc-700"}`}>
                          {item.code}
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
            <Link href="/admin" className="shrink-0 rounded-full bg-zinc-950 px-4 py-2 text-xs font-black text-white">대시보드</Link>
            {menus.map((item) => (
              <Link key={item.href} href={item.href} className="shrink-0 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700">{item.label}</Link>
            ))}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

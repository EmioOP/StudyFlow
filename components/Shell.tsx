"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, isConfigured } from "@/lib/supabase";
import { Icon, Logo } from "@/components/Icons";
import { PageSkeleton } from "@/components/Skeleton";

const NAV = [
  { href: "/", label: "Home", icon: "home" as const },
  { href: "/exams", label: "Exams", icon: "calendar" as const },
  { href: "/subjects", label: "Subjects", icon: "book" as const },
  { href: "/timer", label: "Timer", icon: "timer" as const },
  { href: "/library", label: "Library", icon: "library" as const },
];

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  useEffect(() => {
    if (!isConfigured) { setReady(true); return; }
    const sb = supabase();
    sb.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      if (!data.user) router.replace("/login");
      setUser(data.user);
      setReady(true);
    });
  }, [router]);
  return { user, ready };
}

export default function Shell({ children }: { children: (user: User) => React.ReactNode }) {
  const { user, ready } = useUser();
  const path = usePathname();
  if (!isConfigured) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <div className="card space-y-2">
          <h1 className="text-lg font-semibold">Supabase is not configured</h1>
          <p className="text-sm">Copy <code>.env.example</code> to <code>.env.local</code> and add your project URL and anon key, then restart. See README.</p>
        </div>
      </main>
    );
  }
  if (!ready || !user) return <main className="mx-auto max-w-4xl p-6"><PageSkeleton /></main>;
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 p-4 dark:border-slate-800 md:block">
        <div className="mb-6 flex items-center gap-2 text-lg font-bold"><Logo size={30} />StudyFlow</div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${active(n.href) ? "bg-brand/10 font-medium text-brand" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
              <Icon name={n.icon} size={20} />{n.label}
            </Link>
          ))}
        </nav>
        <button className="btn-ghost mt-8 w-full" onClick={async () => { await supabase().auth.signOut(); location.href = "/login"; }}><Icon name="logout" size={16} />Sign out</button>
      </aside>
      <main className="mx-auto w-full max-w-4xl flex-1 p-4 pb-24 md:p-8 md:pb-8">{children(user)}</main>
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`flex flex-1 flex-col items-center py-2 text-[11px] ${active(n.href) ? "text-brand" : "text-slate-500"}`}>
            <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active(n.href) ? "bg-brand/15" : ""}`}><Icon name={n.icon} size={21} /></span>{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

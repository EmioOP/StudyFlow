"use client";
import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { Icon } from "@/components/Icons";
import { PageSkeleton } from "@/components/Skeleton";
import { addDays, todayStr } from "@/lib/dates";
import { BADGES, type Stats } from "@/lib/rewards";
import { loadStats } from "@/lib/rewardStore";

function Heatmap({ minutesByDay }: { minutesByDay: Record<string, number> }) {
  const today = todayStr();
  const weeks = 15;
  const dow = (new Date(today + "T00:00:00").getDay() + 6) % 7; // Monday = 0
  const start = addDays(today, -(weeks * 7 - 1 - (6 - dow)));
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const shade = (m: number) => (m <= 0 ? "" : m < 30 ? "bg-indigo-200 dark:bg-indigo-900" : m < 90 ? "bg-indigo-400 dark:bg-indigo-700" : m < 180 ? "bg-indigo-500" : "bg-indigo-700 dark:bg-indigo-400");
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex w-max gap-1" role="img" aria-label="Study activity over the last 15 weeks">
        {cols.map((col, i) => (
          <div key={i} className="flex flex-col gap-1">
            {col.map((d) => {
              const m = minutesByDay[d] ?? 0;
              return <div key={d} title={`${d}: ${m} min`} className={`h-4 w-4 rounded-[5px] ${d > today ? "opacity-0" : m > 0 ? shade(m) : "bg-slate-200 dark:bg-slate-800"}`} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Rewards() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  useEffect(() => { loadStats().then(({ stats, data }) => { setStats(stats); setUnlocked(new Set([...data.unlocked, ...BADGES.filter((b) => b.test(stats)).map((b) => b.id)])); }); }, []);
  const week = useMemo(() => {
    const today = todayStr();
    const dow = (new Date(today + "T00:00:00").getDay() + 6) % 7;
    return Array.from({ length: 7 }, (_, i) => addDays(today, i - dow));
  }, []);
  if (!stats) return <PageSkeleton />;
  const L = stats.level;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Rewards</h1>

      <section className="card flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
          <span className="text-[10px] uppercase tracking-wide opacity-80">Level</span><span className="text-3xl font-extrabold leading-none">{L.level}</span>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="font-semibold">{L.title}</div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700" style={{ width: `${L.pct}%` }} /></div>
          <div className="text-xs text-slate-500">{L.into} / {L.span} XP to level {L.level + 1} · {stats.xp} XP total</div>
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center gap-3">
          <Icon name="flame" size={36} className={`${stats.streak > 0 ? "sf-flicker text-orange-500" : "text-slate-300 dark:text-slate-700"}`} />
          <div>
            <div className="text-2xl font-extrabold leading-none">{stats.streak} <span className="text-base font-semibold">day streak</span></div>
            <div className="text-xs text-slate-500">{stats.streak === 0 ? "Study today to start a streak." : stats.activeDays.has(todayStr()) ? "Today is counted. See you tomorrow." : "Study today to keep it alive."} Best: {stats.bestStreak}</div>
          </div>
        </div>
        <div className="flex justify-between">
          {week.map((d, i) => {
            const on = stats.activeDays.has(d);
            return (
              <div key={d} className="flex flex-col items-center gap-1 text-[10px] text-slate-500">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${on ? "bg-orange-500 text-white" : "bg-slate-200 dark:bg-slate-800"} ${d === todayStr() ? "ring-2 ring-brand ring-offset-2 ring-offset-white dark:ring-offset-slate-900" : ""}`}>{on && <Icon name="check" size={16} strokeWidth={3} />}</span>
                {"MTWTFSS"[i]}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 text-center">
        {[[stats.totalBlocks, "blocks done"], [Math.round(stats.totalMinutes / 6) / 10, "hours studied"], [stats.topicsDone, "topics done"]].map(([n, l]) => (
          <div key={l as string} className="card !p-3"><div className="text-2xl font-extrabold tabular-nums">{n}</div><div className="text-xs text-slate-500">{l}</div></div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Last 15 weeks</h2>
        <div className="card"><Heatmap minutesByDay={stats.minutesByDay} /></div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Badges <span className="text-sm font-normal text-slate-500">{BADGES.filter((b) => unlocked.has(b.id)).length} of {BADGES.length}</span></h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BADGES.map((b) => {
            const got = unlocked.has(b.id);
            return (
              <div key={b.id} className={`card flex items-start gap-3 !p-3 ${got ? "" : "opacity-60"}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${got ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-800"}`}><Icon name={got ? b.icon : "lock"} size={20} /></span>
                <div className="min-w-0"><div className="text-sm font-semibold">{b.name}</div><div className="text-xs text-slate-500">{b.desc}</div></div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
export default function Page() { return <Shell>{() => <Rewards />}</Shell>; }

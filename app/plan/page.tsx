"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Shell from "@/components/Shell";
import BlockSheet, { fmtTime } from "@/components/BlockSheet";
import { Switch } from "@/components/Check";
import { Icon } from "@/components/Icons";
import { PageSkeleton } from "@/components/Skeleton";
import { supabase } from "@/lib/supabase";
import { addDays, todayStr } from "@/lib/dates";
import { dailyPlan, nextRevisionDate } from "@/lib/progress";
import { blockReward, comboFor, DEFAULT_SETTINGS, type Block, type Settings, type Stats } from "@/lib/rewards";
import { awardFlow, loadStats } from "@/lib/rewardStore";
import { burst, centerOf, floatText, toast } from "@/lib/celebrate";
import { sound } from "@/lib/sound";
import type { Exam, Subject, Topic } from "@/lib/types";

const CHEERS = ["Nice focus!", "One block closer.", "That counts. Keep going.", "Solid session.", "Progress made."];
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const toMin = (v: string) => { const [h, m] = v.split(":").map(Number); return h * 60 + (m || 0); };

function Ring({ done, goal }: { done: number; goal: number }) {
  const r = 34, c = 2 * Math.PI * r, pct = Math.min(1, done / Math.max(goal, 1)), hit = done >= goal;
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 80 80" className="-rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-slate-200 dark:stroke-slate-800" />
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          stroke={hit ? "#f59e0b" : "#6366f1"} style={{ transition: "stroke-dashoffset .6s ease, stroke .3s" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        {hit ? <Icon name="star" size={22} className="text-amber-500" /> : <span className="text-xl font-bold tabular-nums">{done}</span>}
        <span className="mt-0.5 text-[10px] text-slate-500">of {goal}</span>
      </div>
    </div>
  );
}

function Plan() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [day, setDay] = useState(todayStr());
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sheet, setSheet] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());
  const scrolled = useRef(false);

  const load = useCallback(async () => {
    const sb = supabase();
    const [{ data, stats }, s, t, e] = await Promise.all([
      loadStats(), sb.from("subjects").select("*").order("created_at"), sb.from("topics").select("*").order("position"), sb.from("exams").select("*"),
    ]);
    setSettings(data.settings); setBlocks(data.blocks); setStats(stats);
    setSubjects((s.data ?? []) as Subject[]); setTopics((t.data ?? []) as Topic[]); setExams((e.data ?? []) as Exam[]);
    setLoaded(true);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(id); }, []);

  const today = todayStr(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const cells = useMemo(() => {
    const out: { start: number; end: number }[] = [];
    for (let t = settings.day_start; t < settings.day_end; t += settings.block_minutes) out.push({ start: t, end: Math.min(t + settings.block_minutes, settings.day_end) });
    return out;
  }, [settings]);
  const rows = useMemo(() => {
    const m = new Map<number, typeof cells>();
    cells.forEach((c) => m.set(Math.floor(c.start / 60), [...(m.get(Math.floor(c.start / 60)) ?? []), c]));
    return [...m.entries()];
  }, [cells]);

  const dayBlocks = blocks.filter((b) => b.day === day);
  const doneBlocks = dayBlocks.filter((b) => b.status === "done");
  const blockAt = (c: { start: number; end: number }) => dayBlocks.find((b) => b.start_min >= c.start && b.start_min < c.end);
  const xpToday = doneBlocks.reduce((a, b) => a + b.xp, 0);
  const sub = (id: string | null) => subjects.find((s) => s.id === id);

  useEffect(() => {
    if (!loaded || scrolled.current || day !== today) return;
    scrolled.current = true;
    setTimeout(() => document.querySelector('[data-now="1"]')?.scrollIntoView({ block: "center", behavior: "smooth" }), 150);
  }, [loaded, day, today]);

  /* ---------- actions ---------- */
  async function plan(start: number, subjectId: string, topicId: string | null, count: number) {
    setBusy(true);
    const idx = cells.findIndex((c) => c.start === start);
    const rowsToAdd = cells.slice(idx, idx + count).map((c, i) => ({ day, start_min: c.start, minutes: c.end - c.start, subject_id: subjectId, topic_id: i === 0 ? topicId : null }));
    await supabase().from("time_blocks").insert(rowsToAdd);
    setSheet(null); await load(); setBusy(false);
  }

  async function complete(b: Block, tickTopic: boolean) {
    setBusy(true);
    sound.unlock();
    const anchor = centerOf(document.querySelector(`[data-cell="${b.start_min}"]`));
    const sb = supabase();
    const color = sub(b.subject_id)?.color;
    const r = await awardFlow(async (_before, d) => {
      const doneSameDay = d.blocks.filter((x) => x.day === b.day && x.status === "done");
      const combo = comboFor(doneSameDay, b.start_min);
      const makesGoal = b.day === todayStr() && doneSameDay.length + 1 === d.settings.daily_goal_blocks;
      const reward = blockReward({ minutes: b.minutes, combo, makesGoal });
      const started = new Date(b.day + "T00:00:00"); started.setMinutes(b.start_min);
      await sb.from("time_blocks").update({ status: "done", completed_at: new Date().toISOString(), xp: reward.total }).eq("id", b.id);
      await sb.from("study_sessions").insert({ subject_id: b.subject_id, minutes: b.minutes, started_at: started.toISOString(), block_id: b.id, xp: 0 });
      if (tickTopic && b.topic_id) await sb.from("topics").update({ done: true, revision_count: 0, next_revision_at: nextRevisionDate(0, todayStr()) }).eq("id", b.topic_id);
      return { reward, combo };
    }, { sound: settings.reward_sound });

    const { reward, combo } = r.result;
    setSheet(null);
    burst({ ...anchor, count: 36 + combo * 6, color });
    floatText(anchor.x, anchor.y - 8, `+${reward.total} XP`, "#f59e0b");
    if (combo >= 2) toast(`Combo ×${combo}. +${reward.comboBonus} bonus XP`);
    else if (!r.goalReached && !r.levelUp && !r.newBadges.length) toast(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
    if (settings.reward_sound && !(r.goalReached || r.levelUp || r.newBadges.length)) sound.reward(false);
    await load(); setBusy(false);
  }

  async function setStatus(b: Block, status: "planned" | "skipped") {
    setBusy(true);
    const sb = supabase();
    if (b.status === "done") await sb.from("study_sessions").delete().eq("block_id", b.id);
    await sb.from("time_blocks").update({ status, xp: 0, completed_at: null }).eq("id", b.id);
    setSheet(null); await load(); setBusy(false);
  }
  async function clear(b: Block) {
    setBusy(true);
    await supabase().from("time_blocks").delete().eq("id", b.id);
    setSheet(null); await load(); setBusy(false);
  }

  async function autoFill() {
    const items = dailyPlan(topics, exams).slice(0, 12);
    const free = cells.filter((c) => !blockAt(c) && (day > today || (day === today && c.start >= nowMin - settings.block_minutes + 1)));
    const rowsToAdd = items.slice(0, free.length).map((it, i) => ({ day, start_min: free[i].start, minutes: free[i].end - free[i].start, subject_id: it.topic.subject_id, topic_id: it.topic.id }));
    if (!rowsToAdd.length) { toast("No free blocks left to fill."); return; }
    setBusy(true);
    await supabase().from("time_blocks").insert(rowsToAdd);
    toast(`Planned ${rowsToAdd.length} ${rowsToAdd.length === 1 ? "block" : "blocks"} from your daily plan`);
    await load(); setBusy(false);
  }

  if (!loaded) return <PageSkeleton />;
  const sheetCell = cells.find((c) => c.start === sheet);
  const sheetBlock = sheetCell ? blockAt(sheetCell) : undefined;
  const maxBlocks = (() => {
    if (!sheetCell) return 1;
    const i = cells.indexOf(sheetCell); let n = 0;
    while (i + n < cells.length && !blockAt(cells[i + n]) && n < 8) n++;
    return Math.max(n, 1);
  })();
  const isToday = day === today;
  const label = isToday ? "Today" : day === addDays(today, 1) ? "Tomorrow" : day === addDays(today, -1) ? "Yesterday" : new Date(day + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button className="btn-ghost !px-2" aria-label="Previous day" onClick={() => setDay(addDays(day, -1))}><Icon name="left" size={18} /></button>
          <h1 className="min-w-28 text-center text-xl font-bold">{label}</h1>
          <button className="btn-ghost !px-2" aria-label="Next day" onClick={() => setDay(addDays(day, 1))}><Icon name="right" size={18} /></button>
          {!isToday && <button className="btn-ghost ml-1 text-xs" onClick={() => setDay(today)}>Today</button>}
        </div>
        <button className="btn-ghost !px-2.5" aria-label="Plan settings" onClick={() => setShowSettings(true)}><Icon name="gear" size={18} /></button>
      </header>

      <section className="card flex items-center gap-4">
        <Ring done={doneBlocks.length} goal={settings.daily_goal_blocks} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-semibold">{doneBlocks.length >= settings.daily_goal_blocks ? "Daily goal reached" : `${settings.daily_goal_blocks - doneBlocks.length} more to reach your goal`}</div>
          <div className="text-xs text-slate-500">{doneBlocks.length} {doneBlocks.length === 1 ? "block" : "blocks"} · {doneBlocks.reduce((a, b) => a + b.minutes, 0)} min · {xpToday} XP</div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 font-medium text-orange-500"><Icon name="flame" size={14} className={stats && stats.streak > 0 ? "sf-flicker" : ""} />{stats?.streak ?? 0} day streak</span>
            <span className="text-slate-500">Level {stats?.level.level ?? 1}</span>
          </div>
        </div>
      </section>

      {dayBlocks.length === 0 && (
        <div className="rounded-2xl bg-indigo-50 p-3 text-sm dark:bg-indigo-950/50">
          Tap a block to plan what you will study. {subjects.length > 0 && <button className="font-medium text-brand underline" disabled={busy} onClick={autoFill}>Fill from my daily plan</button>}
        </div>
      )}
      {dayBlocks.length > 0 && subjects.length > 0 && (isToday || day > today) && <button className="text-xs text-brand underline" disabled={busy} onClick={autoFill}>Fill empty blocks from my daily plan</button>}

      <div className="space-y-2" aria-label="Time blocks">
        {rows.map(([hour, row]) => (
          <div key={hour} className="flex items-stretch gap-3">
            <div className="w-12 shrink-0 pt-4 text-right text-xs text-slate-500">{fmtTime(hour * 60).replace(":00", "")}</div>
            <div className="flex flex-1 gap-2">
              {row.map((c) => {
                const b = blockAt(c); const s = sub(b?.subject_id ?? null);
                const isNow = isToday && nowMin >= c.start && nowMin < c.end;
                const past = day < today || (isToday && c.end <= nowMin);
                const combo = b?.status === "done" ? comboFor(doneBlocks, b.start_min) : 0;
                const color = s?.color ?? "#6366f1";
                let style: React.CSSProperties = {};
                let cls = "border-2 border-dashed border-slate-300 dark:border-slate-700";
                if (b?.status === "planned") { cls = "border-2"; style = { background: color + "22", borderColor: color + "88" }; }
                if (b?.status === "done") { cls = "border-2 border-transparent text-white"; style = { background: color, boxShadow: `0 4px 14px ${color}55` }; }
                if (b?.status === "skipped") { cls = "border-2 border-slate-300 dark:border-slate-700"; style = { backgroundImage: "repeating-linear-gradient(135deg, rgba(148,163,184,.25) 0 6px, transparent 6px 12px)" }; }
                return (
                  <button key={c.start} data-cell={c.start} data-now={isNow ? "1" : undefined} onClick={() => setSheet(c.start)}
                    aria-label={`${fmtTime(c.start)} ${b ? `${s?.name ?? "study"} ${b.status}` : "free"}`}
                    className={`relative h-16 min-w-0 flex-1 rounded-2xl px-2 text-left text-xs transition active:scale-95 ${cls} ${isNow ? "ring-2 ring-brand ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950" : ""} ${!b && past ? "opacity-50" : ""} ${b?.status === "done" ? "sf-done" : ""}`}
                    style={style}>
                    {!b && <span className="flex h-full items-center justify-center text-slate-400"><Icon name="plus" size={16} /></span>}
                    {b && (
                      <span className="flex h-full flex-col justify-center gap-0.5">
                        <span className="flex items-center gap-1 font-semibold">{b.status === "done" && <Icon name="check" size={14} strokeWidth={3} />}<span className="truncate">{s?.name ?? "Study"}</span></span>
                        <span className={`truncate ${b.status === "done" ? "text-white/80" : "text-slate-500"}`}>{fmtTime(c.start).replace(" ", "").toLowerCase()}</span>
                      </span>
                    )}
                    {combo >= 2 && <span className="absolute -right-1 -top-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-950">×{combo}</span>}
                    {isNow && <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-brand" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {sheetCell && (
        <BlockSheet key={sheetCell.start} start={sheetCell.start} end={sheetCell.end} day={day} block={sheetBlock} subjects={subjects} topics={topics}
          maxBlocks={maxBlocks} blockMinutes={sheetCell.end - sheetCell.start} canComplete={day <= today} busy={busy} onClose={() => setSheet(null)}
          onPlan={(sid, tid, n) => plan(sheetCell.start, sid, tid, n)}
          onDone={(tick) => sheetBlock && complete(sheetBlock, tick)} onSkip={() => sheetBlock && setStatus(sheetBlock, "skipped")}
          onClear={() => sheetBlock && clear(sheetBlock)} onUndo={() => sheetBlock && setStatus(sheetBlock, "planned")} />
      )}
      {showSettings && <SettingsSheet settings={settings} onClose={() => setShowSettings(false)} onSaved={() => { setShowSettings(false); load(); }} />}
    </div>
  );
}

function SettingsSheet({ settings, onClose, onSaved }: { settings: Settings; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState(settings);
  const [err, setErr] = useState("");
  async function save() {
    if (v.day_end - v.day_start < v.block_minutes) { setErr("The day must be at least one block long."); return; }
    const { error } = await supabase().from("user_settings").upsert(v, { onConflict: "user_id" });
    if (error) { setErr("Could not save. Did you run the 002 database migration?"); return; }
    onSaved();
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label="Plan settings">
      <div className="w-full max-w-md space-y-4 rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Plan settings</h2>
          <button aria-label="Close" className="rounded-lg p-1 text-slate-400" onClick={onClose}><Icon name="close" size={20} /></button></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="bl">Block length</label>
            <select id="bl" className="input" value={v.block_minutes} onChange={(e) => setV({ ...v, block_minutes: +e.target.value })}>
              {[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
            </select></div>
          <div><label className="label" htmlFor="gl">Daily goal (blocks)</label>
            <input id="gl" type="number" min={1} max={48} className="input" value={v.daily_goal_blocks} onChange={(e) => setV({ ...v, daily_goal_blocks: Math.max(1, +e.target.value || 1) })} /></div>
          <div><label className="label" htmlFor="ds">Day starts</label>
            <input id="ds" type="time" step={900} className="input" value={hhmm(v.day_start)} onChange={(e) => e.target.value && setV({ ...v, day_start: toMin(e.target.value) })} /></div>
          <div><label className="label" htmlFor="de">Day ends</label>
            <input id="de" type="time" step={900} className="input" value={hhmm(v.day_end === 1440 ? 1439 : v.day_end)} onChange={(e) => e.target.value && setV({ ...v, day_end: toMin(e.target.value) })} /></div>
        </div>
        <div className="flex items-center justify-between text-sm"><span>Reward sounds</span><Switch label="Reward sounds" checked={v.reward_sound} onChange={(x) => setV({ ...v, reward_sound: x })} /></div>
        <p className="text-xs text-slate-500">Changing the block length only affects blocks you plan from now on.</p>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn w-full !py-3" onClick={save}>Save settings</button>
      </div>
    </div>
  );
}

export default function Page() { return <Shell>{() => <Plan />}</Shell>; }

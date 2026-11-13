import { addDays, todayStr } from "./dates.ts";

export type Settings = { block_minutes: number; day_start: number; day_end: number; daily_goal_blocks: number; reward_sound: boolean };
export const DEFAULT_SETTINGS: Settings = { block_minutes: 30, day_start: 7 * 60, day_end: 22 * 60, daily_goal_blocks: 4, reward_sound: true };

export type Block = {
  id: string; day: string; start_min: number; minutes: number; subject_id: string | null; topic_id: string | null;
  status: "planned" | "done" | "skipped"; completed_at: string | null; xp: number;
};
export type SessionRow = { minutes: number; xp: number; started_at: string };

/* ---------- XP and levels ---------- */
export const xpAtLevel = (n: number) => 50 * n * (n - 1); // level 2 at 100, 3 at 300, 4 at 600 ...
const TITLES: [number, string][] = [[1, "Warm-up"], [2, "Page turner"], [3, "Note taker"], [4, "Focused"], [5, "Deep worker"], [7, "Revision pro"], [9, "Exam ready"], [12, "Scholar"], [16, "Topper"], [20, "Legend"]];
export function levelInfo(xp: number) {
  let level = 1;
  while (xpAtLevel(level + 1) <= xp) level++;
  const cur = xpAtLevel(level), next = xpAtLevel(level + 1);
  const title = [...TITLES].reverse().find(([min]) => level >= min)![1];
  return { level, title, into: xp - cur, span: next - cur, pct: Math.round(((xp - cur) / (next - cur)) * 100), next };
}

export function blockReward({ minutes, combo, makesGoal }: { minutes: number; combo: number; makesGoal: boolean }) {
  const base = Math.max(5, Math.round((10 * minutes) / 30));
  const comboBonus = Math.min(Math.max(combo - 1, 0), 5) * 3;
  const goalBonus = makesGoal ? 20 : 0;
  return { base, comboBonus, goalBonus, total: base + comboBonus + goalBonus };
}
/** Focus-timer sessions earn 1 XP per 3 minutes. */
export const timerXp = (minutes: number) => Math.max(1, Math.round(minutes / 3));

/** Number of back-to-back finished blocks ending with a block at `start` (including it). */
export function comboFor(doneOnDay: Pick<Block, "start_min" | "minutes">[], start: number): number {
  const byEnd = new Map(doneOnDay.map((b) => [b.start_min + b.minutes, b]));
  let combo = 1, cursor = start;
  for (;;) {
    const prev = byEnd.get(cursor);
    if (!prev) return combo;
    combo++; cursor = prev.start_min;
  }
}

/* ---------- streaks ---------- */
export function streaks(days: Set<string>, today: string) {
  let current = 0;
  let d = days.has(today) ? today : addDays(today, -1);
  while (days.has(d)) { current++; d = addDays(d, -1); }
  const sorted = [...days].sort();
  let best = 0, run = 0, prev = "";
  for (const day of sorted) {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run); prev = day;
  }
  return { current, best };
}

/* ---------- stats ---------- */
export type Stats = ReturnType<typeof computeStats>;
export function computeStats(i: {
  blocks: Block[]; sessions: SessionRow[]; topics: { subject_id: string; done: boolean }[]; settings: Settings; today?: string;
}) {
  const today = i.today ?? todayStr();
  const done = i.blocks.filter((b) => b.status === "done");
  const xp = done.reduce((a, b) => a + b.xp, 0) + i.sessions.reduce((a, s) => a + s.xp, 0);
  const minutesByDay: Record<string, number> = {};
  for (const s of i.sessions) {
    const k = todayStr(new Date(s.started_at));
    minutesByDay[k] = (minutesByDay[k] ?? 0) + s.minutes;
  }
  const activeDays = new Set(Object.keys(minutesByDay).filter((k) => minutesByDay[k] > 0));
  const { current, best } = streaks(activeDays, today);

  const byDay = new Map<string, Block[]>();
  for (const b of done) byDay.set(b.day, [...(byDay.get(b.day) ?? []), b]);
  let maxCombo = 0, maxBlocksInDay = 0, goalDays = 0;
  for (const list of byDay.values()) {
    maxBlocksInDay = Math.max(maxBlocksInDay, list.length);
    if (list.length >= i.settings.daily_goal_blocks) goalDays++;
    for (const b of list) maxCombo = Math.max(maxCombo, comboFor(list, b.start_min));
  }
  const bySubject = new Map<string, { n: number; done: number }>();
  for (const t of i.topics) {
    const e = bySubject.get(t.subject_id) ?? { n: 0, done: 0 };
    e.n++; if (t.done) e.done++; bySubject.set(t.subject_id, e);
  }
  const blocksToday = (byDay.get(today) ?? []).length;
  return {
    xp, level: levelInfo(xp), streak: current, bestStreak: best, activeDays, minutesByDay,
    totalBlocks: done.length, totalMinutes: i.sessions.reduce((a, s) => a + s.minutes, 0),
    blocksToday, minutesToday: minutesByDay[today] ?? 0, maxCombo, maxBlocksInDay, goalDays,
    topicsDone: i.topics.filter((t) => t.done).length,
    subjectsComplete: [...bySubject.values()].filter((s) => s.n >= 3 && s.done === s.n).length,
    earlyBird: done.some((b) => b.start_min < 8 * 60),
    goal: i.settings.daily_goal_blocks,
  };
}

/* ---------- badges ---------- */
export type BadgeDef = { id: string; name: string; desc: string; icon: "star" | "flame" | "trophy" | "timer" | "check" | "calendar" | "book" | "bolt"; test: (s: Stats) => boolean };
export const BADGES: BadgeDef[] = [
  { id: "first_block", name: "First block", desc: "Finish your first study block", icon: "check", test: (s) => s.totalBlocks >= 1 },
  { id: "goal_day", name: "Goal getter", desc: "Reach your daily block goal", icon: "star", test: (s) => s.goalDays >= 1 },
  { id: "combo_4", name: "In the zone", desc: "Finish 4 blocks back to back", icon: "bolt", test: (s) => s.maxCombo >= 4 },
  { id: "five_day", name: "Big day", desc: "Finish 5 blocks in one day", icon: "calendar", test: (s) => s.maxBlocksInDay >= 5 },
  { id: "early_bird", name: "Early bird", desc: "Finish a block that starts before 8 am", icon: "timer", test: (s) => s.earlyBird },
  { id: "streak_3", name: "3-day streak", desc: "Study 3 days in a row", icon: "flame", test: (s) => s.bestStreak >= 3 },
  { id: "streak_7", name: "Week warrior", desc: "Study 7 days in a row", icon: "flame", test: (s) => s.bestStreak >= 7 },
  { id: "streak_30", name: "Unstoppable", desc: "Study 30 days in a row", icon: "flame", test: (s) => s.bestStreak >= 30 },
  { id: "blocks_10", name: "10 blocks", desc: "Finish 10 study blocks", icon: "check", test: (s) => s.totalBlocks >= 10 },
  { id: "blocks_50", name: "50 blocks", desc: "Finish 50 study blocks", icon: "check", test: (s) => s.totalBlocks >= 50 },
  { id: "blocks_100", name: "100 blocks", desc: "Finish 100 study blocks", icon: "trophy", test: (s) => s.totalBlocks >= 100 },
  { id: "hours_10", name: "10 hours", desc: "Study for 10 hours in total", icon: "timer", test: (s) => s.totalMinutes >= 600 },
  { id: "hours_50", name: "50 hours", desc: "Study for 50 hours in total", icon: "timer", test: (s) => s.totalMinutes >= 3000 },
  { id: "topics_25", name: "Topic crusher", desc: "Complete 25 topics", icon: "book", test: (s) => s.topicsDone >= 25 },
  { id: "subject_done", name: "Subject cleared", desc: "Complete every topic of a subject", icon: "trophy", test: (s) => s.subjectsComplete >= 1 },
  { id: "level_5", name: "Deep worker", desc: "Reach level 5", icon: "star", test: (s) => s.level.level >= 5 },
];

import { supabase } from "./supabase";
import { BADGES, DEFAULT_SETTINGS, computeStats, type Block, type SessionRow, type Settings, type Stats } from "./rewards";
import { showModal, toast } from "./celebrate";
import { sound } from "./sound";

export type RewardData = {
  settings: Settings; blocks: Block[]; sessions: SessionRow[]; topics: { subject_id: string; done: boolean }[]; unlocked: Set<string>;
};

export async function loadRewardData(): Promise<RewardData> {
  const sb = supabase();
  const [st, bl, se, tp, bd] = await Promise.all([
    sb.from("user_settings").select("*").maybeSingle(),
    sb.from("time_blocks").select("*"),
    sb.from("study_sessions").select("minutes,xp,started_at"),
    sb.from("topics").select("subject_id,done"),
    sb.from("badges").select("badge_id"),
  ]);
  return {
    settings: { ...DEFAULT_SETTINGS, ...(st.data ?? {}) },
    blocks: (bl.data ?? []) as Block[],
    sessions: (se.data ?? []) as SessionRow[],
    topics: (tp.data ?? []) as { subject_id: string; done: boolean }[],
    unlocked: new Set(((bd.data ?? []) as { badge_id: string }[]).map((b) => b.badge_id)),
  };
}

export async function loadStats() {
  const data = await loadRewardData();
  return { data, stats: computeStats({ blocks: data.blocks, sessions: data.sessions, topics: data.topics, settings: data.settings }) };
}

/**
 * Runs `action` (which writes progress) and then works out what the user just earned:
 * goal reached, level up, new badges. Shows the pop-ups and returns what happened.
 */
export async function awardFlow<T>(
  action: (before: Stats, data: RewardData) => Promise<T>,
  opts: { sound?: boolean } = {}
) {
  const before = await loadStats();
  const result = await action(before.stats, before.data);
  const after = await loadStats();

  const goalReached = before.stats.blocksToday < after.stats.goal && after.stats.blocksToday >= after.stats.goal;
  const levelUp = after.stats.level.level > before.stats.level.level;
  const newBadges = BADGES.filter((b) => b.test(after.stats) && !after.data.unlocked.has(b.id));

  if (newBadges.length) {
    await supabase().from("badges").upsert(newBadges.map((b) => ({ badge_id: b.id })), { onConflict: "user_id,badge_id", ignoreDuplicates: true });
  }
  if (opts.sound && (goalReached || levelUp || newBadges.length)) sound.reward(true);

  if (goalReached) showModal({ kind: "goal", title: "Daily goal reached!", subtitle: `${after.stats.goal} blocks done today. +20 bonus XP.`, icon: "star", color: "#f59e0b" });
  if (levelUp) showModal({ kind: "level", title: `Level ${after.stats.level.level}`, subtitle: `You are now a ${after.stats.level.title}.`, icon: "trophy", color: "#6366f1" });
  newBadges.slice(0, 3).forEach((b) => showModal({ kind: "badge", title: b.name, subtitle: b.desc, icon: b.icon, color: "#10b981" }));
  if (newBadges.length > 3) toast(`${newBadges.length - 3} more badges unlocked. See Rewards.`);
  return { result, before: before.stats, after: after.stats, goalReached, levelUp, newBadges };
}

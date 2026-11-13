import { test } from "node:test";
import assert from "node:assert/strict";
import { blockReward, comboFor, computeStats, levelInfo, streaks, timerXp, DEFAULT_SETTINGS, BADGES, type Block } from "./rewards.ts";

const blk = (day: string, start: number, over: Partial<Block> = {}): Block => ({ id: day + start, day, start_min: start, minutes: 30, subject_id: "s", topic_id: null, status: "done", completed_at: null, xp: 10, ...over });

test("levels", () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(99).level, 1);
  assert.equal(levelInfo(100).level, 2);
  assert.equal(levelInfo(300).level, 3);
  assert.equal(levelInfo(150).pct, 25);
});

test("block reward and combo", () => {
  assert.equal(blockReward({ minutes: 30, combo: 1, makesGoal: false }).total, 10);
  assert.equal(blockReward({ minutes: 60, combo: 3, makesGoal: false }).total, 26);
  assert.equal(blockReward({ minutes: 30, combo: 20, makesGoal: true }).total, 10 + 15 + 20);
  const done = [blk("d", 420), blk("d", 450), blk("d", 510)];
  assert.equal(comboFor(done, 480), 3); // 7:00, 7:30, then 8:00
  assert.equal(comboFor(done, 600), 1); // gap
  assert.equal(timerXp(25), 8);
});

test("streaks", () => {
  const days = new Set(["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-05"]);
  assert.deepEqual(streaks(days, "2026-11-13"), { current: 3, best: 3 });   // today empty, yesterday counts
  assert.deepEqual(streaks(days, "2026-11-20"), { current: 0, best: 3 });
});

test("stats and badges", () => {
  const blocks = [blk("2026-11-13", 420), blk("2026-11-13", 450), blk("2026-11-13", 480), blk("2026-11-13", 510)];
  const sessions = blocks.map((b) => ({ minutes: 30, xp: 0, started_at: new Date(2026, 10, 13, 7).toISOString() }));
  const s = computeStats({ blocks, sessions, topics: [{ subject_id: "a", done: true }, { subject_id: "a", done: true }, { subject_id: "a", done: true }], settings: DEFAULT_SETTINGS, today: "2026-11-13" });
  assert.equal(s.xp, 40);
  assert.equal(s.blocksToday, 4);
  assert.equal(s.maxCombo, 4);
  assert.equal(s.goalDays, 1);
  assert.equal(s.subjectsComplete, 1);
  assert.equal(s.earlyBird, true);
  const ids = BADGES.filter((b) => b.test(s)).map((b) => b.id);
  for (const want of ["first_block", "goal_day", "combo_4", "early_bird", "subject_done"]) assert.ok(ids.includes(want), want);
  assert.ok(!ids.includes("streak_7"));
});

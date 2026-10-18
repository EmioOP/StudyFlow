import type { Topic, Exam } from "./types";
import { daysUntil, todayStr } from "./dates";

export function percent(topics: Pick<Topic, "done">[]) {
  if (!topics.length) return 0;
  return Math.round((topics.filter((t) => t.done).length / topics.length) * 100);
}

// Spaced revision gaps (days) after completing a topic and after each revision.
const GAPS = [3, 7, 14];
export const MAX_REVISIONS = GAPS.length;
export function nextRevisionDate(count: number, from: string): string | null {
  if (count >= GAPS.length) return null;
  const d = new Date(from + "T00:00:00");
  d.setDate(d.getDate() + GAPS[count]);
  return todayStr(d);
}

export type PlanItem = { topic: Topic; kind: "learn" | "revise" };

// Today's plan: spread remaining topics evenly over days left before each exam
// (hardest/highest-priority first) plus any revisions that are due.
export function dailyPlan(topics: Topic[], exams: Exam[], today = todayStr()): PlanItem[] {
  const plan: PlanItem[] = [];
  const bySubject = new Map<string, Topic[]>();
  topics.forEach((t) => bySubject.set(t.subject_id, [...(bySubject.get(t.subject_id) ?? []), t]));
  for (const exam of exams) {
    const left = daysUntil(exam.exam_date, new Date(today + "T00:00:00"));
    if (left < 0) continue;
    const pending = (bySubject.get(exam.subject_id) ?? [])
      .filter((t) => !t.done)
      .sort((a, b) => b.priority - a.priority || b.difficulty - a.difficulty || a.position - b.position);
    if (!pending.length) continue;
    const perDay = Math.ceil(pending.length / Math.max(left, 1));
    pending.slice(0, perDay).forEach((t) => plan.push({ topic: t, kind: "learn" }));
  }
  topics
    .filter((t) => t.done && t.next_revision_at && t.next_revision_at <= today)
    .forEach((t) => plan.push({ topic: t, kind: "revise" }));
  return plan;
}

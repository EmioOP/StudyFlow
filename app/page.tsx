"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import ProgressBar from "@/components/ProgressBar";
import { supabase } from "@/lib/supabase";
import type { Exam, Session, Subject, Topic } from "@/lib/types";
import { dailyPlan, percent, nextRevisionDate, MAX_REVISIONS } from "@/lib/progress";
import { daysUntil, fmtDate, todayStr } from "@/lib/dates";

function Dashboard() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  const load = useCallback(async () => {
    const sb = supabase();
    const [s, t, e, ss] = await Promise.all([
      sb.from("subjects").select("*"),
      sb.from("topics").select("*"),
      sb.from("exams").select("*").order("exam_date"),
      sb.from("study_sessions").select("*").gte("started_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);
    setSubjects((s.data ?? []) as Subject[]); setTopics((t.data ?? []) as Topic[]);
    setExams((e.data ?? []) as Exam[]); setSessions((ss.data ?? []) as Session[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const today = todayStr();
  const upcoming = exams.filter((e) => daysUntil(e.exam_date) >= 0);
  const plan = dailyPlan(topics, exams);
  const subj = (id: string) => subjects.find((s) => s.id === id);
  const todayMinutes = sessions.filter((s) => todayStr(new Date(s.started_at)) === today).reduce((a, s) => a + s.minutes, 0);
  const weekMinutes = sessions.reduce((a, s) => a + s.minutes, 0);

  async function tick(item: { topic: Topic; kind: "learn" | "revise" }) {
    const t = item.topic;
    const patch = item.kind === "learn"
      ? { done: true, next_revision_at: nextRevisionDate(0, today) }
      : { revision_count: t.revision_count + 1, next_revision_at: nextRevisionDate(t.revision_count + 1, today) };
    await supabase().from("topics").update(patch).eq("id", t.id);
    load();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-500">Overall progress {percent(topics)}% · {todayMinutes} min today · {Math.round(weekMinutes / 60 * 10) / 10} h this week</p>
        <div className="mt-2"><ProgressBar value={percent(topics)} /></div>
      </header>

      <section>
        <h2 className="mb-2 font-semibold">Upcoming exams</h2>
        {upcoming.length === 0 && <p className="card text-sm text-slate-500">No upcoming exams. <Link className="text-brand underline" href="/exams">Add your timetable</Link>.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {upcoming.map((e) => {
            const s = subj(e.subject_id); if (!s) return null;
            const st = topics.filter((t) => t.subject_id === s.id);
            const d = daysUntil(e.exam_date);
            return (
              <Link key={e.id} href={`/subjects/${s.id}`} className="card block space-y-2" style={{ borderLeft: `4px solid ${s.color}` }}>
                <div className="flex items-start justify-between">
                  <div><div className="font-medium">{s.name}</div><div className="text-xs text-slate-500">{fmtDate(e.exam_date)}</div></div>
                  <div className="text-right"><div className="text-2xl font-bold leading-none">{d}</div><div className="text-[10px] uppercase text-slate-500">{d === 1 ? "day" : "days"} left</div></div>
                </div>
                <ProgressBar value={percent(st)} color={s.color} />
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Today&apos;s plan</h2>
        {plan.length === 0 && <p className="card text-sm text-slate-500">Nothing planned. Add exam dates and syllabus topics to get a daily plan.</p>}
        <ul className="space-y-2">
          {plan.map((p) => {
            const s = subj(p.topic.subject_id);
            return (
              <li key={p.kind + p.topic.id} className="card flex items-center gap-3 !p-3">
                <input type="checkbox" className="h-5 w-5 accent-indigo-500" onChange={() => tick(p)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{p.topic.title}</div>
                  <div className="text-xs text-slate-500">{s?.name}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${p.kind === "revise" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"}`}>
                  {p.kind === "revise" ? `Revise ${p.topic.revision_count + 1}/${MAX_REVISIONS}` : "Learn"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export default function Page() { return <Shell>{() => <Dashboard />}</Shell>; }

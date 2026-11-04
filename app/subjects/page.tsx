"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import ProgressBar from "@/components/ProgressBar";
import { Icon } from "@/components/Icons";
import { PageSkeleton } from "@/components/Skeleton";
import { supabase } from "@/lib/supabase";
import type { Exam, Subject, Topic } from "@/lib/types";
import { percent } from "@/lib/progress";
import { daysUntil, fmtDate } from "@/lib/dates";

function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Pick<Topic, "subject_id" | "done">[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    const [s, t, e] = await Promise.all([sb.from("subjects").select("*").order("created_at"), sb.from("topics").select("subject_id,done"), sb.from("exams").select("*")]);
    setSubjects((s.data ?? []) as Subject[]); setTopics((t.data ?? []) as any); setExams((e.data ?? []) as Exam[]);
    setLoaded(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!loaded) return <PageSkeleton />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Subjects</h1>
        <Link href="/subjects/new" className="btn"><Icon name="plus" size={16} />Add subject</Link>
      </div>
      {subjects.length === 0 && (
        <div className="card space-y-3 text-center">
          <p className="font-medium">No subjects yet</p>
          <p className="text-sm text-slate-500">Add your first subject, or start from a syllabus a classmate has shared.</p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/subjects/new" className="btn">Add a subject</Link>
            <Link href="/library" className="btn-ghost">Browse the library</Link>
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {subjects.map((s) => {
          const st = topics.filter((t) => t.subject_id === s.id);
          const ex = exams.find((e) => e.subject_id === s.id);
          return (
            <Link key={s.id} href={`/subjects/${s.id}`} className="card block space-y-2" style={{ borderLeft: `4px solid ${s.color}` }}>
              <div className="font-medium">{s.name} {s.code && <span className="text-xs font-normal text-slate-500">{s.code}</span>}</div>
              <div className="text-xs text-slate-500">
                {ex ? `${fmtDate(ex.exam_date)} (${daysUntil(ex.exam_date)} days)` : "No exam date"}
                {" · "}{st.length ? `${st.filter((t) => t.done).length} of ${st.length} topics done` : "No syllabus yet"}
              </div>
              <ProgressBar value={percent(st)} color={s.color} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
export default function Page() { return <Shell>{() => <Subjects />}</Shell>; }

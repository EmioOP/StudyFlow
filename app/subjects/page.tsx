"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import ProgressBar from "@/components/ProgressBar";
import { supabase } from "@/lib/supabase";
import type { Exam, Subject, Topic } from "@/lib/types";
import { percent } from "@/lib/progress";
import { daysUntil, fmtDate } from "@/lib/dates";

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#8b5cf6", "#84cc16"];

function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Pick<Topic, "subject_id" | "done">[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [name, setName] = useState(""); const [code, setCode] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    const [s, t, e] = await Promise.all([sb.from("subjects").select("*").order("created_at"), sb.from("topics").select("subject_id,done"), sb.from("exams").select("*")]);
    setSubjects((s.data ?? []) as Subject[]); setTopics((t.data ?? []) as any); setExams((e.data ?? []) as Exam[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await supabase().from("subjects").insert({ name: name.trim(), code: code.trim() || null, color: COLORS[subjects.length % COLORS.length] });
    setName(""); setCode(""); load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Subjects</h1>
      <form onSubmit={add} className="card flex flex-col gap-2 sm:flex-row">
        <input className="input" placeholder="Subject name (e.g. Design and Analysis of Algorithms)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input sm:w-32" placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn">Add</button>
      </form>
      <p className="text-xs text-slate-500">Tip: you can also import a ready-made subject with syllabus from the <Link className="underline" href="/library">shared library</Link>.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {subjects.map((s) => {
          const st = topics.filter((t) => t.subject_id === s.id);
          const ex = exams.find((e) => e.subject_id === s.id);
          return (
            <Link key={s.id} href={`/subjects/${s.id}`} className="card block space-y-2" style={{ borderLeft: `4px solid ${s.color}` }}>
              <div className="font-medium">{s.name} {s.code && <span className="text-xs text-slate-500">· {s.code}</span>}</div>
              <div className="text-xs text-slate-500">{ex ? `${fmtDate(ex.exam_date)} · ${daysUntil(ex.exam_date)} days` : "No exam date"} · {st.filter((t) => t.done).length}/{st.length} topics</div>
              <ProgressBar value={percent(st)} color={s.color} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
export default function Page() { return <Shell>{() => <Subjects />}</Shell>; }

"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";
import type { Exam, Subject } from "@/lib/types";
import { daysUntil, fmtDate } from "@/lib/dates";
import { Icon } from "@/components/Icons";

function Exams() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjectId, setSubjectId] = useState(""); const [date, setDate] = useState("");
  const [time, setTime] = useState(""); const [venue, setVenue] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    const [s, e] = await Promise.all([sb.from("subjects").select("*").order("name"), sb.from("exams").select("*").order("exam_date")]);
    setSubjects((s.data ?? []) as Subject[]); setExams((e.data ?? []) as Exam[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId || !date) return;
    await supabase().from("exams").upsert({ subject_id: subjectId, exam_date: date, start_time: time || null, venue: venue || null }, { onConflict: "subject_id" });
    setSubjectId(""); setDate(""); setTime(""); setVenue(""); load();
  }
  const edit = (x: Exam) => { setSubjectId(x.subject_id); setDate(x.exam_date); setTime(x.start_time?.slice(0, 5) ?? ""); setVenue(x.venue ?? ""); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Exam timetable</h1>
      <form onSubmit={save} className="card grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2"><label className="label">Subject</label>
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Select subject…</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
        <div><label className="label">Date</label><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="label">Time</label><input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        <div className="sm:col-span-3"><label className="label">Venue (optional)</label><input className="input" value={venue} onChange={(e) => setVenue(e.target.value)} /></div>
        <div className="flex items-end"><button className="btn w-full">Save exam</button></div>
      </form>
      {subjects.length === 0 && <p className="text-sm text-slate-500">Add subjects first.</p>}
      <ul className="space-y-2">
        {exams.map((x) => {
          const s = subjects.find((s) => s.id === x.subject_id); const d = daysUntil(x.exam_date);
          return (
            <li key={x.id} className={`card flex items-center gap-3 !p-3 ${d < 0 ? "opacity-50" : ""}`} style={{ borderLeft: `4px solid ${s?.color}` }}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{s?.name}</div>
                <div className="text-xs text-slate-500">{fmtDate(x.exam_date)}{x.start_time && ` · ${x.start_time.slice(0, 5)}`}{x.venue && ` · ${x.venue}`}</div>
              </div>
              <div className="text-sm font-semibold">{d < 0 ? "Done" : d === 0 ? "Today" : `${d}d`}</div>
              <button className="btn-ghost !px-2" onClick={() => edit(x)}>Edit</button>
              <button className="btn-ghost !px-2" onClick={async () => { await supabase().from("exams").delete().eq("id", x.id); load(); }} aria-label="Delete exam"><Icon name="trash" size={16} /></button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
export default function Page() { return <Shell>{() => <Exams />}</Shell>; }

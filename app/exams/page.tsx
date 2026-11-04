"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { Icon } from "@/components/Icons";
import { PageSkeleton } from "@/components/Skeleton";
import { supabase } from "@/lib/supabase";
import type { Exam, Subject } from "@/lib/types";
import { daysUntil } from "@/lib/dates";

function Exams() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    const [s, e] = await Promise.all([sb.from("subjects").select("*").order("name"), sb.from("exams").select("*")]);
    setSubjects((s.data ?? []) as Subject[]); setExams((e.data ?? []) as Exam[]); setLoaded(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(subjectId: string, patch: Partial<Exam>) {
    const cur = exams.find((x) => x.subject_id === subjectId);
    const next = { subject_id: subjectId, exam_date: cur?.exam_date, start_time: cur?.start_time ?? null, venue: cur?.venue ?? null, ...patch };
    if (!next.exam_date) return;
    setExams((all) => cur ? all.map((x) => (x.subject_id === subjectId ? { ...x, ...patch } as Exam : x)) : [...all, { id: "tmp" + subjectId, ...next } as Exam]);
    await supabase().from("exams").upsert(next, { onConflict: "subject_id" });
    setSaved(subjectId); setTimeout(() => setSaved((v) => (v === subjectId ? null : v)), 1500);
    load();
  }
  async function clear(subjectId: string) {
    setExams((all) => all.filter((x) => x.subject_id !== subjectId));
    await supabase().from("exams").delete().eq("subject_id", subjectId);
  }

  if (!loaded) return <PageSkeleton />;
  if (subjects.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Exam timetable</h1>
        <div className="card space-y-3 text-center">
          <p className="font-medium">Add a subject first</p>
          <p className="text-sm text-slate-500">Each subject gets one exam date. They will show up here in date order.</p>
          <Link href="/subjects/new" className="btn mx-auto">Add a subject</Link>
        </div>
      </div>
    );
  }
  const rows = [...subjects].sort((a, b) => {
    const da = exams.find((e) => e.subject_id === a.id)?.exam_date, db = exams.find((e) => e.subject_id === b.id)?.exam_date;
    if (da && db) return da.localeCompare(db);
    return da ? -1 : db ? 1 : a.name.localeCompare(b.name);
  });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Exam timetable</h1>
        <p className="text-sm text-slate-500">Pick a date for each subject. It saves automatically.</p>
      </div>
      <ul className="space-y-2">
        {rows.map((s) => {
          const x = exams.find((e) => e.subject_id === s.id);
          const d = x ? daysUntil(x.exam_date) : null;
          return (
            <li key={s.id} className={`card !p-3 ${d !== null && d < 0 ? "opacity-60" : ""}`} style={{ borderLeft: `4px solid ${s.color}` }}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1 basis-40">
                  <div className="truncate font-medium">{s.name}</div>
                  <div className="text-xs text-slate-500">
                    {saved === s.id ? "Saved" : d === null ? "No date yet" : d < 0 ? "Exam finished" : d === 0 ? "Today" : `${d} ${d === 1 ? "day" : "days"} to go`}
                  </div>
                </div>
                <input type="date" aria-label={`Exam date for ${s.name}`} className="input !w-auto" value={x?.exam_date ?? ""} onChange={(e) => e.target.value && save(s.id, { exam_date: e.target.value })} />
                <button type="button" aria-label="Time and venue" aria-expanded={open === s.id} disabled={!x} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800" onClick={() => setOpen(open === s.id ? null : s.id)}>
                  <Icon name="more" size={18} />
                </button>
              </div>
              {open === s.id && x && (
                <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <div><label className="label">Time</label><input type="time" className="input" value={x.start_time?.slice(0, 5) ?? ""} onChange={(e) => save(s.id, { start_time: e.target.value || null })} /></div>
                  <div className="min-w-32 flex-1"><label className="label">Venue</label><input className="input" defaultValue={x.venue ?? ""} onBlur={(e) => save(s.id, { venue: e.target.value || null })} /></div>
                  <button type="button" className="btn-ghost text-red-600" onClick={() => clear(s.id)}>Remove date</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
export default function Page() { return <Shell>{() => <Exams />}</Shell>; }

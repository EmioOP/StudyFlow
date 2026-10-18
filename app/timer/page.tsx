"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";
import type { Session, Subject } from "@/lib/types";
import { todayStr } from "@/lib/dates";

type Mode = "focus" | "break";

function Timer() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [focusMin, setFocusMin] = useState(25); const [breakMin, setBreakMin] = useState(5);
  const [mode, setMode] = useState<Mode>("focus");
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const endAt = useRef<number>(0);

  const load = useCallback(async () => {
    const sb = supabase();
    const [s, ss] = await Promise.all([sb.from("subjects").select("*").order("name"), sb.from("study_sessions").select("*").order("started_at", { ascending: false }).limit(200)]);
    setSubjects((s.data ?? []) as Subject[]); setSessions((ss.data ?? []) as Session[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const finish = useCallback(async (m: Mode, minutes: number) => {
    if (m === "focus" && minutes > 0) {
      await supabase().from("study_sessions").insert({ subject_id: subjectId || null, minutes });
      load();
    }
  }, [subjectId, load]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const r = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(r);
      if (r === 0) {
        setRunning(false);
        try { navigator.vibrate?.(300); new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=").play().catch(() => {}); } catch {}
        finish(mode, focusMin);
        const next: Mode = mode === "focus" ? "break" : "focus";
        setMode(next); setLeft((next === "focus" ? focusMin : breakMin) * 60);
      }
    }, 500);
    return () => clearInterval(id);
  }, [running, mode, focusMin, breakMin, finish]);

  const start = () => { endAt.current = Date.now() + left * 1000; setRunning(true); };
  const stopEarly = async () => {
    setRunning(false);
    if (mode === "focus") {
      const done = Math.floor((focusMin * 60 - left) / 60);
      if (done >= 1) await finish("focus", done);
    }
    setLeft((mode === "focus" ? focusMin : breakMin) * 60);
  };

  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  const today = todayStr();
  const todayTotal = sessions.filter((s) => todayStr(new Date(s.started_at)) === today).reduce((a, s) => a + s.minutes, 0);
  const perSubject = subjects.map((s) => ({ s, min: sessions.filter((x) => x.subject_id === s.id).reduce((a, x) => a + x.minutes, 0) })).filter((x) => x.min > 0);
  const maxMin = Math.max(1, ...perSubject.map((x) => x.min));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Study timer</h1>
      <div className="card space-y-4 text-center">
        <div className="text-xs uppercase tracking-widest text-slate-500">{mode === "focus" ? "Focus" : "Break"}</div>
        <div className="text-7xl font-bold tabular-nums">{mm}:{ss}</div>
        <select className="input mx-auto max-w-xs" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={running}>
          <option value="">No subject</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex justify-center gap-2">
          {!running ? <button className="btn px-8" onClick={start}>Start</button> : <button className="btn px-8" onClick={stopEarly}>Stop &amp; save</button>}
        </div>
        <div className="flex justify-center gap-4 text-xs text-slate-500">
          <label>Focus <input type="number" min={1} className="input !inline-block !w-16" value={focusMin} disabled={running} onChange={(e) => { setFocusMin(+e.target.value || 25); if (mode === "focus") setLeft((+e.target.value || 25) * 60); }} /> min</label>
          <label>Break <input type="number" min={1} className="input !inline-block !w-16" value={breakMin} disabled={running} onChange={(e) => { setBreakMin(+e.target.value || 5); if (mode === "break") setLeft((+e.target.value || 5) * 60); }} /> min</label>
        </div>
      </div>
      <section>
        <h2 className="mb-2 font-semibold">Time studied · {todayTotal} min today</h2>
        <div className="card space-y-2">
          {perSubject.length === 0 && <p className="text-sm text-slate-500">No sessions yet.</p>}
          {perSubject.map(({ s, min }) => (
            <div key={s.id} className="text-sm">
              <div className="flex justify-between"><span>{s.name}</span><span className="text-slate-500">{Math.round(min / 6) / 10} h</span></div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full" style={{ width: `${(min / maxMin) * 100}%`, background: s.color }} /></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
export default function Page() { return <Shell>{() => <Timer />}</Shell>; }

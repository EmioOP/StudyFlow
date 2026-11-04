"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import SyllabusInput from "@/components/SyllabusInput";
import { supabase } from "@/lib/supabase";
import { saveSyllabus } from "@/lib/saveSyllabus";
import type { LibrarySubject, ParsedModule } from "@/lib/types";
import { daysUntil } from "@/lib/dates";

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#8b5cf6", "#84cc16"];

function NewSubject() {
  const router = useRouter();
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [date, setDate] = useState("");
  const [modules, setModules] = useState<ParsedModule[]>([]);
  const [injected, setInjected] = useState<{ source: string; modules: ParsedModule[] } | null>(null);
  const [library, setLibrary] = useState<LibrarySubject[]>([]);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");

  useEffect(() => {
    const sb = supabase();
    sb.from("library_subjects").select("*").order("imports", { ascending: false }).limit(100).then(({ data }: { data: LibrarySubject[] | null }) => setLibrary(data ?? []));
    sb.from("subjects").select("id", { count: "exact", head: true }).then(({ count }: { count: number | null }) => setCount(count ?? 0));
  }, []);

  const matches = useMemo(() => {
    const q = (name + " " + code).trim().toLowerCase();
    if (q.length < 2 || injected) return [];
    return library.filter((l) => `${l.name} ${l.code ?? ""}`.toLowerCase().includes(name.trim().toLowerCase()) || (code.trim() && (l.code ?? "").toLowerCase() === code.trim().toLowerCase())).slice(0, 3);
  }, [library, name, code, injected]);

  const total = modules.reduce((a, m) => a + m.topics.length, 0);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setErr("");
    try {
      const sb = supabase();
      const { data, error } = await sb.from("subjects").insert({ name: name.trim(), code: code.trim() || null, color: COLORS[count % COLORS.length] }).select().single();
      if (error || !data) throw error ?? new Error("Could not create the subject");
      if (date) await sb.from("exams").upsert({ subject_id: data.id, exam_date: date }, { onConflict: "subject_id" });
      if (total) await saveSyllabus(data.id, modules);
      if (injected) { const l = library.find((x) => x.name === injected.source); if (l) sb.rpc("bump_library_import", { lib_id: l.id }); }
      router.push(`/subjects/${data.id}`);
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong. Check your connection and try again.");
      setBusy(false);
    }
  }

  const days = date ? daysUntil(date) : null;
  return (
    <form onSubmit={create} className="mx-auto max-w-xl space-y-6 pb-8">
      <header>
        <h1 className="text-2xl font-bold">Add a subject</h1>
        <p className="text-sm text-slate-500">Only the name is required. You can add the rest later.</p>
      </header>

      <section className="space-y-3">
        <div>
          <label className="label" htmlFor="name">Subject name</label>
          <input id="name" autoFocus className="input !py-3 text-base" placeholder="e.g. Design and Analysis of Algorithms" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label" htmlFor="code">Subject code <span className="font-normal">(optional)</span></label>
            <input id="code" className="input" placeholder="e.g. CST306" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="label" htmlFor="date">Exam date <span className="font-normal">(optional)</span></label>
            <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        {days !== null && <p className="text-xs text-slate-500">{days < 0 ? "That date has already passed." : days === 0 ? "The exam is today." : `${days} days to prepare. We'll spread your topics over them.`}</p>}
      </section>

      {matches.length > 0 && (
        <section className="space-y-2 rounded-2xl bg-indigo-50 p-3 dark:bg-indigo-950/50">
          <p className="text-sm font-medium">A classmate already shared this syllabus</p>
          {matches.map((l) => (
            <div key={l.id} className="flex items-center gap-2 text-sm">
              <div className="min-w-0 flex-1 truncate">{l.name}{l.code && ` · ${l.code}`} <span className="text-xs text-slate-500">({l.syllabus.reduce((a, m) => a + m.topics.length, 0)} topics)</span></div>
              <button type="button" className="btn !px-3 !py-1.5 text-xs" onClick={() => { setInjected({ source: l.name, modules: l.syllabus }); if (!code && l.code) setCode(l.code); }}>Use it</button>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <div>
          <h2 className="font-semibold">Syllabus <span className="text-sm font-normal text-slate-500">(optional)</span></h2>
          <p className="text-sm text-slate-500">Each topic becomes a tick-off item, and your progress is calculated from them.</p>
        </div>
        <SyllabusInput onChange={setModules} injected={injected} onClearInjected={() => setInjected(null)} />
      </section>

      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{err}</p>}
      <div className="sticky bottom-20 md:bottom-4">
        <button className="btn w-full !py-3 text-base shadow-lg" disabled={busy || !name.trim()}>
          {busy ? "Creating…" : total ? `Create subject with ${total} topics` : "Create subject"}
        </button>
      </div>
    </form>
  );
}
export default function Page() { return <Shell>{() => <NewSubject />}</Shell>; }

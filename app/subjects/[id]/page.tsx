"use client";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import ProgressBar from "@/components/ProgressBar";
import SyllabusImport from "@/components/SyllabusImport";
import SubjectNotes from "@/components/SubjectNotes";
import { supabase } from "@/lib/supabase";
import type { Exam, Module, Session, Subject, Topic } from "@/lib/types";
import { MAX_REVISIONS, nextRevisionDate, percent } from "@/lib/progress";
import { daysUntil, fmtDate, todayStr } from "@/lib/dates";

const LEVEL = ["", "Low", "Med", "High"];

function SubjectView({ userId, userName }: { userId: string; userName: string }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tab, setTab] = useState<"topics" | "import" | "notes" | "log">("topics");
  const [newTopic, setNewTopic] = useState(""); const [newModule, setNewModule] = useState("");
  const [pub, setPub] = useState(false); const [branch, setBranch] = useState(""); const [sem, setSem] = useState(""); const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const sb = supabase();
    const [s, m, t, e, ss] = await Promise.all([
      sb.from("subjects").select("*").eq("id", id).single(),
      sb.from("modules").select("*").eq("subject_id", id).order("position"),
      sb.from("topics").select("*").eq("subject_id", id).order("position"),
      sb.from("exams").select("*").eq("subject_id", id).maybeSingle(),
      sb.from("study_sessions").select("*").eq("subject_id", id).order("started_at", { ascending: false }),
    ]);
    setSubject(s.data as Subject); setModules((m.data ?? []) as Module[]); setTopics((t.data ?? []) as Topic[]);
    setExam(e.data as Exam | null); setSessions((ss.data ?? []) as Session[]);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const upd = async (t: Topic, patch: Partial<Topic>) => {
    setTopics((all) => all.map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
    await supabase().from("topics").update(patch).eq("id", t.id);
  };
  const toggle = (t: Topic) => t.done
    ? upd(t, { done: false, revision_count: 0, next_revision_at: null })
    : upd(t, { done: true, revision_count: 0, next_revision_at: nextRevisionDate(0, todayStr()) });
  const revised = (t: Topic) => upd(t, { revision_count: t.revision_count + 1, next_revision_at: nextRevisionDate(t.revision_count + 1, todayStr()) });

  async function addTopic(moduleId: string | null) {
    if (!newTopic.trim()) return;
    await supabase().from("topics").insert({ subject_id: id, module_id: moduleId, title: newTopic.trim(), position: topics.length });
    setNewTopic(""); load();
  }
  async function addModule() {
    if (!newModule.trim()) return;
    await supabase().from("modules").insert({ subject_id: id, title: newModule.trim(), position: modules.length });
    setNewModule(""); load();
  }
  async function publish() {
    if (!subject) return;
    const syllabus = modules.map((m) => ({ title: m.title, topics: topics.filter((t) => t.module_id === m.id).map((t) => t.title) })).filter((m) => m.topics.length);
    const loose = topics.filter((t) => !t.module_id).map((t) => t.title);
    if (loose.length) syllabus.push({ title: "Other", topics: loose });
    const { error } = await supabase().from("library_subjects").insert({ name: subject.name, code: subject.code, branch: branch || null, semester: sem || null, syllabus, owner_name: userName });
    setMsg(error ? error.message : "Shared with the library!"); setPub(false);
  }
  async function removeSubject() {
    if (!confirm("Delete this subject with all its topics, notes and files?")) return;
    const { data: mats } = await supabase().from("materials").select("path").eq("subject_id", id);
    if (mats?.length) await supabase().storage.from("materials").remove(mats.map((m: { path: string }) => m.path));
    await supabase().from("subjects").delete().eq("id", id);
    router.replace("/subjects");
  }

  if (!subject) return <p className="text-sm text-slate-500">Loading…</p>;
  const total = sessions.reduce((a, s) => a + s.minutes, 0);
  const loose = topics.filter((t) => !t.module_id);

  const TopicRow = ({ t }: { t: Topic }) => {
    const due = t.done && t.next_revision_at && t.next_revision_at <= todayStr();
    return (
      <li className="flex flex-wrap items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <input type="checkbox" className="h-5 w-5 accent-indigo-500" checked={t.done} onChange={() => toggle(t)} />
        <span className={`min-w-0 flex-1 text-sm ${t.done ? "text-slate-400 line-through" : ""}`}>{t.title}</span>
        {due && <button className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800" onClick={() => revised(t)}>Revise now ✓</button>}
        {t.done && !due && t.revision_count > 0 && <span className="text-[10px] text-slate-400">revised {t.revision_count}/{MAX_REVISIONS}</span>}
        <select title="Priority" className="rounded-lg border border-slate-200 bg-transparent px-1 text-[11px] dark:border-slate-700" value={t.priority} onChange={(e) => upd(t, { priority: +e.target.value })}>
          {[1, 2, 3].map((n) => <option key={n} value={n}>P: {LEVEL[n]}</option>)}
        </select>
        <select title="Difficulty" className="rounded-lg border border-slate-200 bg-transparent px-1 text-[11px] dark:border-slate-700" value={t.difficulty} onChange={(e) => upd(t, { difficulty: +e.target.value })}>
          {[1, 2, 3].map((n) => <option key={n} value={n}>D: {LEVEL[n]}</option>)}
        </select>
        <button className="text-slate-300 hover:text-red-500" onClick={async () => { await supabase().from("topics").delete().eq("id", t.id); load(); }}>✕</button>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <header className="card space-y-2" style={{ borderLeft: `4px solid ${subject.color}` }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">{subject.name}</h1>
            <p className="text-xs text-slate-500">{subject.code}{exam ? ` · Exam ${fmtDate(exam.exam_date)} (${daysUntil(exam.exam_date)} days)` : " · No exam date set"} · {Math.round(total / 6) / 10} h studied</p>
          </div>
          <div className="flex gap-1">
            <button className="btn-ghost !px-2 text-xs" onClick={() => setPub(!pub)}>Share</button>
            <button className="btn-ghost !px-2 text-xs" onClick={removeSubject}>Delete</button>
          </div>
        </div>
        <ProgressBar value={percent(topics)} color={subject.color} />
        {pub && (
          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-2 dark:border-slate-800">
            <input className="input flex-1" placeholder="Branch (e.g. CSE)" value={branch} onChange={(e) => setBranch(e.target.value)} />
            <input className="input w-28" placeholder="Semester" value={sem} onChange={(e) => setSem(e.target.value)} />
            <button className="btn" onClick={publish}>Publish syllabus to library</button>
          </div>
        )}
        {msg && <p className="text-xs text-emerald-600">{msg}</p>}
      </header>

      <div className="flex gap-1 overflow-x-auto">
        {([["topics", "Topics"], ["import", "Add syllabus"], ["notes", "Notes & PYQ"], ["log", "Study log"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-sm ${tab === k ? "bg-brand text-white" : "btn-ghost"}`}>{l}</button>
        ))}
      </div>

      {tab === "topics" && (
        <div className="space-y-4">
          {topics.length === 0 && <p className="card text-sm text-slate-500">No topics yet. Use “Add syllabus” to paste or upload the syllabus, or add topics below.</p>}
          {modules.map((m) => {
            const mt = topics.filter((t) => t.module_id === m.id);
            return (
              <section key={m.id} className="card space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{m.title}</h3>
                  <span className="text-xs text-slate-500">{mt.filter((t) => t.done).length}/{mt.length}</span>
                </div>
                <ProgressBar value={percent(mt)} color={subject.color} label={false} />
                <ul>{mt.map((t) => <TopicRow key={t.id} t={t} />)}</ul>
                <form onSubmit={(e) => { e.preventDefault(); addTopic(m.id); }} className="flex gap-2 pt-1">
                  <input className="input" placeholder="Add topic to this module" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} />
                  <button className="btn-ghost">+</button>
                </form>
              </section>
            );
          })}
          {loose.length > 0 && <section className="card"><h3 className="mb-1 font-semibold">Other topics</h3><ul>{loose.map((t) => <TopicRow key={t.id} t={t} />)}</ul></section>}
          <form onSubmit={(e) => { e.preventDefault(); addModule(); }} className="flex gap-2">
            <input className="input" placeholder="New module title" value={newModule} onChange={(e) => setNewModule(e.target.value)} />
            <button className="btn-ghost whitespace-nowrap">Add module</button>
          </form>
        </div>
      )}
      {tab === "import" && <SyllabusImport subjectId={id} onSaved={() => { load(); setTab("topics"); }} />}
      {tab === "notes" && <SubjectNotes subjectId={id} topics={topics} userId={userId} />}
      {tab === "log" && (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">Sessions are logged from the <a className="underline" href="/timer">Timer</a> page.</p>
          {sessions.map((s) => <div key={s.id} className="card flex justify-between !p-3 text-sm"><span>{new Date(s.started_at).toLocaleString("en-IN")}</span><span className="font-medium">{s.minutes} min</span></div>)}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <Shell>{(u) => <SubjectView userId={u.id} userName={(u.user_metadata?.full_name as string) || u.email || "Student"} />}</Shell>;
}

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
import { Check } from "@/components/Check";
import { Icon } from "@/components/Icons";
import { PageSkeleton } from "@/components/Skeleton";
import Link from "next/link";

const LEVEL = ["", "Low", "Medium", "High"];

function Seg({ label, value, onChange, options }: { label: string; value: number; onChange: (n: number) => void; options: [number, string][] }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div role="radiogroup" aria-label={label} className="inline-flex overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700">
        {options.map(([n, t]) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} onClick={() => onChange(n)}
            className={`px-3 py-1.5 text-xs ${value === n ? "bg-brand text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>{t}</button>
        ))}
      </div>
    </div>
  );
}

function SubjectView({ userId, userName }: { userId: string; userName: string }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const [tab, setTab] = useState<"topics" | "import" | "notes" | "log">("topics");
  const setExamDate = async (date: string) => {
    if (!date) return;
    await supabase().from("exams").upsert({ subject_id: id, exam_date: date }, { onConflict: "subject_id" });
    load();
  };
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
    setLoaded(true);
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

  if (!loaded) return <PageSkeleton />;
  if (!subject) return <div className="card space-y-2 text-center"><p className="font-medium">Subject not found</p><Link href="/subjects" className="btn mx-auto">Back to subjects</Link></div>;
  const total = sessions.reduce((a, s) => a + s.minutes, 0);
  const loose = topics.filter((t) => !t.module_id);

  const TopicRow = ({ t }: { t: Topic }) => {
    const due = t.done && t.next_revision_at && t.next_revision_at <= todayStr();
    const isOpen = openTopic === t.id;
    return (
      <li className="rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <div className="flex items-center gap-3 px-2 py-2">
          <Check checked={t.done} onChange={() => toggle(t)} color={subject.color} label={`Mark ${t.title} done`} />
          <span className={`min-w-0 flex-1 text-sm ${t.done ? "text-slate-400 line-through" : ""}`}>{t.title}</span>
          {t.priority === 3 && !t.done && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">Important</span>}
          {due && <button className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800" onClick={() => revised(t)}>Revise now</button>}
          {t.done && !due && t.revision_count > 0 && <span className="text-[10px] text-slate-400">revised {t.revision_count}/{MAX_REVISIONS}</span>}
          <button aria-label="Topic options" aria-expanded={isOpen} className="rounded-md p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => setOpenTopic(isOpen ? null : t.id)}><Icon name="more" size={18} /></button>
        </div>
        {isOpen && (
          <div className="flex flex-wrap items-end gap-4 px-2 pb-3 pl-11">
            <Seg label="How important is it?" value={t.priority} onChange={(n) => upd(t, { priority: n })} options={[[1, "Low"], [2, "Medium"], [3, "High"]]} />
            <Seg label="How hard is it?" value={t.difficulty} onChange={(n) => upd(t, { difficulty: n })} options={[[1, "Easy"], [2, "Medium"], [3, "Hard"]]} />
            <button className="btn-ghost text-red-600" onClick={async () => { await supabase().from("topics").delete().eq("id", t.id); load(); }}><Icon name="trash" size={15} />Delete topic</button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <header className="card space-y-2" style={{ borderLeft: `4px solid ${subject.color}` }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">{subject.name}</h1>
            <p className="text-xs text-slate-500">{subject.code && `${subject.code} · `}{topics.filter((t) => t.done).length} of {topics.length} topics done · {Math.round(total / 6) / 10} h studied</p>
          </div>
          <div className="flex gap-1">
            <button className="btn-ghost !px-2.5" title="Share syllabus with classmates" aria-label="Share syllabus with classmates" onClick={() => setPub(!pub)}><Icon name="share" size={16} /></button>
            <button className="btn-ghost !px-2.5" title="Delete subject" aria-label="Delete subject" onClick={removeSubject}><Icon name="trash" size={16} /></button>
          </div>
        </div>
        <ProgressBar value={percent(topics)} color={subject.color} />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="exam-date" className="text-slate-500">Exam date</label>
          <input id="exam-date" type="date" className="input !w-auto !py-1.5" value={exam?.exam_date ?? ""} onChange={(e) => setExamDate(e.target.value)} />
          {exam ? <span className="text-xs text-slate-500">{daysUntil(exam.exam_date) < 0 ? "finished" : daysUntil(exam.exam_date) === 0 ? "today" : `${daysUntil(exam.exam_date)} days to go`}</span> : <span className="text-xs text-amber-700 dark:text-amber-400">Set it to get a daily plan</span>}
        </div>
        {pub && (
          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-2 dark:border-slate-800">
            <p className="w-full text-xs text-slate-500">Classmates will be able to import this subject's modules and topics (not your notes or progress).</p>
            <input className="input flex-1" placeholder="Branch (e.g. CSE)" value={branch} onChange={(e) => setBranch(e.target.value)} />
            <input className="input w-28" placeholder="Semester" value={sem} onChange={(e) => setSem(e.target.value)} />
            <button className="btn" onClick={publish}>Share syllabus</button>
          </div>
        )}
        {msg && <p className="text-xs text-emerald-600">{msg}</p>}
      </header>

      <div className="flex gap-1 overflow-x-auto">
        {([["topics", "Topics"], ["import", "Import"], ["notes", "Notes & papers"], ["log", "Study log"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-sm ${tab === k ? "bg-brand text-white" : "btn-ghost"}`}>{l}</button>
        ))}
      </div>

      {tab === "topics" && (
        <div className="space-y-4">
          {topics.length === 0 && (
            <div className="card space-y-3">
              <div><h2 className="font-semibold">Add the syllabus</h2><p className="text-sm text-slate-500">Paste it or upload the PDF. Each topic becomes something you can tick off.</p></div>
              <SyllabusImport subjectId={id} onSaved={load} />
              <p className="text-xs text-slate-500">Prefer to type topics one by one? Add a module below.</p>
            </div>
          )}
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
                  <button className="btn-ghost" aria-label="Add topic"><Icon name="plus" size={18} /></button>
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

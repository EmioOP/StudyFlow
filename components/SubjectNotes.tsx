"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Material, Note, Topic } from "@/lib/types";
import { Icon } from "@/components/Icons";

export default function SubjectNotes({ subjectId, topics, userId }: { subjectId: string; topics: Topic[]; userId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<Material[]>([]);
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [topicId, setTopicId] = useState("");
  const [kind, setKind] = useState<"pyq" | "note">("pyq");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    const [n, m] = await Promise.all([
      sb.from("notes").select("*").eq("subject_id", subjectId).order("created_at", { ascending: false }),
      sb.from("materials").select("*").eq("subject_id", subjectId).order("created_at", { ascending: false }),
    ]);
    setNotes((n.data ?? []) as Note[]); setFiles((m.data ?? []) as Material[]);
  }, [subjectId]);
  useEffect(() => { load(); }, [load]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await supabase().from("notes").insert({ subject_id: subjectId, title: title.trim(), body, topic_id: topicId || null });
    setTitle(""); setBody(""); setTopicId(""); load();
  }
  async function upload(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    const sb = supabase();
    const path = `${userId}/${subjectId}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
    const { error } = await sb.storage.from("materials").upload(path, f);
    if (!error) await sb.from("materials").insert({ subject_id: subjectId, kind, title: f.name, path });
    setBusy(false); load();
  }
  async function open(m: Material) {
    const { data } = await supabase().storage.from("materials").createSignedUrl(m.path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }
  async function removeFile(m: Material) {
    await supabase().storage.from("materials").remove([m.path]);
    await supabase().from("materials").delete().eq("id", m.id); load();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="font-semibold">Files</h3>
        <div className="card flex flex-wrap items-center gap-2">
          <select className="input w-auto" value={kind} onChange={(e) => setKind(e.target.value as any)}>
            <option value="pyq">Previous question paper</option><option value="note">Notes file</option>
          </select>
          <input type="file" accept="application/pdf,image/*" disabled={busy} className="text-sm" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <ul className="space-y-1.5">
          {files.map((m) => (
            <li key={m.id} className="card flex items-center gap-2 !p-2.5 text-sm">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase dark:bg-slate-800">{m.kind === "pyq" ? "Paper" : "Notes"}</span>
              <button className="min-w-0 flex-1 truncate text-left underline-offset-2 hover:underline" onClick={() => open(m)}>{m.title}</button>
              <button aria-label="Delete file" className="rounded-md p-1 text-slate-400 hover:text-red-500" onClick={() => removeFile(m)}><Icon name="trash" size={16} /></button>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold">Notes</h3>
        <form onSubmit={addNote} className="card space-y-2">
          <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input h-24" placeholder="Write your note…" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="flex gap-2">
            <select className="input" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">Not linked to a topic</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <button className="btn">Add</button>
          </div>
        </form>
        {notes.map((n) => (
          <div key={n.id} className="card text-sm">
            <div className="flex items-start justify-between"><div className="font-medium">{n.title}</div>
              <button className="rounded-md p-1 text-slate-400 hover:text-red-500" onClick={async () => { await supabase().from("notes").delete().eq("id", n.id); load(); }} aria-label="Delete note"><Icon name="trash" size={16} /></button></div>
            {n.topic_id && <div className="text-xs text-slate-500">Topic: {topics.find((t) => t.id === n.topic_id)?.title}</div>}
            <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

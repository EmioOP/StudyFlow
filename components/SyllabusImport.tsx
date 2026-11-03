"use client";
import { useMemo, useState } from "react";
import { parseSyllabus } from "@/lib/parseSyllabus";
import { pdfToText } from "@/lib/pdfText";
import { saveSyllabus } from "@/lib/saveSyllabus";
import type { ParsedModule } from "@/lib/types";
import { Icon } from "@/components/Icons";

export default function SyllabusImport({ subjectId, onSaved }: { subjectId: string; onSaved: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const parsed = useMemo(() => parseSyllabus(text), [text]);

  const key = (mi: number, ti: number) => `${mi}:${ti}`;
  const modules: ParsedModule[] = parsed
    .map((m, mi) => ({ title: m.title, topics: m.topics.filter((_, ti) => !removed.has(key(mi, ti))) }))
    .filter((m) => m.topics.length);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setErr(""); setBusy(true);
    try { setText(await pdfToText(f)); setRemoved(new Set()); }
    catch { setErr("Could not read this PDF. Try pasting the text instead (scanned PDFs have no text)."); }
    setBusy(false);
  }
  async function save() {
    setBusy(true); setErr("");
    try { await saveSyllabus(subjectId, modules); setText(""); setRemoved(new Set()); onSaved(); }
    catch (e: any) { setErr(e?.message ?? "Save failed"); }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <div className="card space-y-2">
        <p className="text-sm">Paste the syllabus or upload the PDF. Lines like <code>Module 1: Title (8 hours)</code> start a module; topics are split by commas, semicolons, bullets or new lines.</p>
        <input type="file" accept="application/pdf" className="text-sm" onChange={(e) => onFile(e.target.files?.[0])} />
        <textarea className="input h-48 font-mono text-xs" placeholder={"Module 1: Introduction (8 hours)\nTopic one, topic two, topic three\nModule 2: ..."} value={text} onChange={(e) => { setText(e.target.value); setRemoved(new Set()); }} />
        {err && <p className="text-sm text-red-500">{err}</p>}
      </div>
      {modules.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Preview · {modules.reduce((a, m) => a + m.topics.length, 0)} topics</h3>
            <button className="btn" disabled={busy} onClick={save}>Save to subject</button>
          </div>
          {parsed.map((m, mi) => (
            <div key={mi}>
              <div className="text-sm font-medium">{m.title}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {m.topics.map((t, ti) => !removed.has(key(mi, ti)) && (
                  <button key={ti} title="Remove" onClick={() => setRemoved(new Set(removed).add(key(mi, ti)))} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs hover:bg-red-100 dark:bg-slate-800">{t}<Icon name="close" size={12} className="ml-1 inline" /></button>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-500">Tap a topic to remove it if the parser got something wrong.</p>
        </div>
      )}
    </div>
  );
}

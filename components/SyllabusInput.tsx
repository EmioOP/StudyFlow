"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseSyllabus } from "@/lib/parseSyllabus";
import { pdfToText } from "@/lib/pdfText";
import type { ParsedModule } from "@/lib/types";
import { Icon } from "@/components/Icons";

export const EXAMPLE = `Module 1: Introduction (8 hours)
Basics of the subject, Key definitions, Overview of applications
Module 2: Core concepts (9 hours)
First principle, Second principle, Worked examples
Module 3: Advanced topics (8 hours)
Case studies, Problem solving techniques`;

/**
 * Paste text or upload a PDF, see the topics found, remove wrong ones.
 * Reports the final list through onChange. `injected` shows a ready-made syllabus (e.g. from the library).
 */
export default function SyllabusInput({ onChange, injected, onClearInjected }: {
  onChange: (m: ParsedModule[]) => void;
  injected?: { source: string; modules: ParsedModule[] } | null;
  onClearInjected?: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const file = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => (injected ? injected.modules : parseSyllabus(text)), [text, injected]);
  const modules = useMemo(
    () => parsed
      .map((m, mi) => ({ title: m.title, topics: m.topics.filter((_, ti) => !removed.has(`${mi}:${ti}`)) }))
      .filter((m) => m.topics.length),
    [parsed, removed]
  );
  const total = modules.reduce((a, m) => a + m.topics.length, 0);

  const sig = JSON.stringify(modules);
  useEffect(() => { onChange(modules); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sig]);
  useEffect(() => { setRemoved(new Set()); }, [injected]);

  async function onFile(f?: File) {
    if (!f) return;
    setErr(""); setBusy(true);
    try { setText(await pdfToText(f)); setRemoved(new Set()); }
    catch { setErr("This PDF has no readable text (it may be a scan). Paste the syllabus text instead."); }
    setBusy(false);
    if (file.current) file.current.value = "";
  }

  if (injected) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <span>Using the syllabus shared for <b>{injected.source}</b>.</span>
          <button type="button" className="whitespace-nowrap underline" onClick={onClearInjected}>Use my own instead</button>
        </div>
        <Preview parsed={parsed} removed={removed} setRemoved={setRemoved} total={total} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" disabled={busy} onClick={() => file.current?.click()}>
          <Icon name="upload" size={16} />{busy ? "Reading PDF…" : "Upload syllabus PDF"}
        </button>
        <input ref={file} type="file" accept="application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        {!text && <button type="button" className="btn-ghost" onClick={() => setText(EXAMPLE)}><Icon name="sparkle" size={16} />Try an example</button>}
        {text && <button type="button" className="btn-ghost" onClick={() => { setText(""); setRemoved(new Set()); }}>Clear</button>}
      </div>
      <textarea
        className="input h-40 text-sm"
        placeholder={"…or paste the syllabus here.\n\nStart each module with “Module 1”, “Module 2”… and list its topics below, separated by commas or new lines."}
        value={text}
        onChange={(e) => { setText(e.target.value); setRemoved(new Set()); }}
      />
      {err && <p className="text-sm text-red-600">{err}</p>}
      {text.trim() && total === 0 && <p className="text-sm text-amber-700 dark:text-amber-400">No topics found yet. Put topics on a new line after each “Module 1” heading.</p>}
      {total > 0 && <Preview parsed={parsed} removed={removed} setRemoved={setRemoved} total={total} />}
    </div>
  );
}

function Preview({ parsed, removed, setRemoved, total }: {
  parsed: ParsedModule[]; removed: Set<string>; setRemoved: (s: Set<string>) => void; total: number;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-sm font-medium">{total} {total === 1 ? "topic" : "topics"} in {parsed.filter((m) => m.topics.length).length} {parsed.length === 1 ? "module" : "modules"}</p>
      {parsed.map((m, mi) => (
        <div key={mi}>
          <div className="text-sm font-medium">{m.title}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {m.topics.map((t, ti) => !removed.has(`${mi}:${ti}`) && (
              <button type="button" key={ti} title="Remove this topic" onClick={() => setRemoved(new Set(removed).add(`${mi}:${ti}`))}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs hover:bg-red-100 dark:bg-slate-800 dark:hover:bg-red-950">
                {t}<Icon name="close" size={12} />
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-500">Tap a topic to remove it if it was split wrongly. You can add or edit topics later.</p>
    </div>
  );
}

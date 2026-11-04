"use client";
import { useState } from "react";
import SyllabusInput from "@/components/SyllabusInput";
import { saveSyllabus } from "@/lib/saveSyllabus";
import type { ParsedModule } from "@/lib/types";

/** Add a syllabus to an existing subject. */
export default function SyllabusImport({ subjectId, onSaved }: { subjectId: string; onSaved: () => void }) {
  const [modules, setModules] = useState<ParsedModule[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const total = modules.reduce((a, m) => a + m.topics.length, 0);

  async function save() {
    setBusy(true); setErr("");
    try { await saveSyllabus(subjectId, modules); onSaved(); }
    catch (e: any) { setErr(e?.message ?? "Could not save. Check your connection and try again."); }
    setBusy(false);
  }
  return (
    <div className="space-y-3">
      <SyllabusInput onChange={setModules} />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="btn w-full sm:w-auto" disabled={busy || total === 0} onClick={save}>
        {busy ? "Saving…" : total ? `Add ${total} topics` : "Add topics"}
      </button>
    </div>
  );
}

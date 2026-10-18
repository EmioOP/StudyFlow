"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";
import type { LibrarySubject } from "@/lib/types";
import { saveSyllabus } from "@/lib/saveSyllabus";

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#8b5cf6", "#84cc16"];

function Library({ userId }: { userId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<LibrarySubject[]>([]);
  const [q, setQ] = useState(""); const [busy, setBusy] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase().from("library_subjects").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as LibrarySubject[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function importSubject(l: LibrarySubject) {
    setBusy(l.id);
    try {
      const sb = supabase();
      const { count } = await sb.from("subjects").select("id", { count: "exact", head: true });
      const { data, error } = await sb.from("subjects").insert({ name: l.name, code: l.code, color: COLORS[(count ?? 0) % COLORS.length] }).select().single();
      if (error || !data) throw error;
      await saveSyllabus(data.id, l.syllabus);
      await sb.rpc("bump_library_import", { lib_id: l.id });
      router.push(`/subjects/${data.id}`);
    } finally { setBusy(""); }
  }

  const shown = items.filter((i) => `${i.name} ${i.code} ${i.branch} ${i.semester}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Shared library</h1>
      <p className="text-sm text-slate-500">Syllabi shared by classmates. Import one to get the subject with all modules and topics ready. To share your own, open a subject and press Share.</p>
      <input className="input" placeholder="Search by subject, code, branch or semester" value={q} onChange={(e) => setQ(e.target.value)} />
      {shown.length === 0 && <p className="card text-sm text-slate-500">Nothing here yet.</p>}
      {shown.map((l) => (
        <div key={l.id} className="card space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium">{l.name} {l.code && <span className="text-xs text-slate-500">· {l.code}</span>}</div>
              <div className="text-xs text-slate-500">{[l.branch, l.semester && `Sem ${l.semester}`].filter(Boolean).join(" · ")} · by {l.owner_name ?? "a student"} · {l.imports} imports · {l.syllabus.reduce((a, m) => a + m.topics.length, 0)} topics</div>
            </div>
            <div className="flex gap-1">
              <button className="btn-ghost !px-2 text-xs" onClick={() => setOpen(open === l.id ? null : l.id)}>{open === l.id ? "Hide" : "View"}</button>
              {l.owner_id === userId && <button className="btn-ghost !px-2 text-xs" onClick={async () => { await supabase().from("library_subjects").delete().eq("id", l.id); load(); }}>Remove</button>}
              <button className="btn !px-3 text-xs" disabled={busy === l.id} onClick={() => importSubject(l)}>Import</button>
            </div>
          </div>
          {open === l.id && l.syllabus.map((m, i) => (
            <div key={i} className="text-sm"><div className="font-medium">{m.title}</div><ul className="ml-4 list-disc text-slate-600 dark:text-slate-400">{m.topics.map((t, j) => <li key={j}>{t}</li>)}</ul></div>
          ))}
        </div>
      ))}
    </div>
  );
}
export default function Page() { return <Shell>{(u) => <Library userId={u.id} />}</Shell>; }

import { supabase } from "./supabase";
import type { ParsedModule } from "./types";

/** Appends modules and topics to a subject. */
export async function saveSyllabus(subjectId: string, modules: ParsedModule[]) {
  const sb = supabase();
  const { count } = await sb.from("modules").select("id", { count: "exact", head: true }).eq("subject_id", subjectId);
  const base = count ?? 0;
  const { data: mods, error } = await sb
    .from("modules")
    .insert(modules.map((m, i) => ({ subject_id: subjectId, title: m.title, position: base + i })))
    .select();
  if (error || !mods) throw error ?? new Error("Could not save modules");
  // inserted rows come back in insertion order
  const rows = modules.flatMap((m, i) => m.topics.map((t, j) => ({ subject_id: subjectId, module_id: mods[i].id, title: t, position: j })));
  if (rows.length) {
    const { error: e2 } = await sb.from("topics").insert(rows);
    if (e2) throw e2;
  }
}

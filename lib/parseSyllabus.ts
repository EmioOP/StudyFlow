import type { ParsedModule } from "./types.ts";

const MODULE_RE = /^\s*(?:module|unit|chapter)\s*[-:.]?\s*(?:\d+|[ivx]+)\b\s*[-:.)]?\s*(.*)$/i;
const HOURS_RE = /\(?\s*\d+\s*(?:hours?|hrs?)\s*\)?/gi;

function splitTopics(text: string): string[] {
  // split on , ; bullets and newlines, but not inside brackets
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of text) {
    if ("([{".includes(ch)) depth++;
    if (")]}".includes(ch)) depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === "," || ch === ";" || ch === "\n" || ch === "•" || ch === "●")) {
      out.push(cur); cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out
    .map((s) => s.replace(/^[\s\-–*•●\d.)]+/, "").replace(/[.\s]+$/, "").replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 1);
}

/** Turns pasted/extracted syllabus text into modules with topics. */
export function parseSyllabus(raw: string): ParsedModule[] {
  const lines = raw.replace(/\r/g, "").split("\n");
  const modules: { title: string; body: string[] }[] = [];
  let current: { title: string; body: string[] } | null = null;
  for (const line of lines) {
    const m = line.match(MODULE_RE);
    if (m) {
      const label = line.match(/^\s*((?:module|unit|chapter)\s*[-:.]?\s*(?:\d+|[ivx]+))/i)![1].replace(/\s+/g, " ").replace(/[-:.]$/, "").trim();
      const rest = m[1].replace(HOURS_RE, "").trim();
      // "Module 1: Intro (8 hrs) topic a, topic b" -> title is text up to first ':' / '-' / '.' if long
      current = { title: rest && rest.length <= 60 && !/[,;]/.test(rest) ? `${label}: ${rest}` : label, body: [] };
      if (rest && current.title === label) current.body.push(rest);
      modules.push(current);
    } else if (line.trim()) {
      if (!current) { current = { title: "Syllabus", body: [] }; modules.push(current); }
      current.body.push(line.replace(HOURS_RE, ""));
    }
  }
  return modules
    .map((m) => ({ title: m.title, topics: splitTopics(m.body.join("\n")) }))
    .filter((m) => m.topics.length > 0);
}

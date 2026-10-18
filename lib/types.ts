export type Subject = { id: string; name: string; code: string | null; color: string };
export type Exam = { id: string; subject_id: string; exam_date: string; start_time: string | null; venue: string | null };
export type Module = { id: string; subject_id: string; title: string; position: number };
export type Topic = {
  id: string; subject_id: string; module_id: string | null; title: string; position: number;
  done: boolean; priority: number; difficulty: number; revision_count: number; next_revision_at: string | null;
};
export type Session = { id: string; subject_id: string | null; minutes: number; started_at: string };
export type Note = { id: string; subject_id: string; topic_id: string | null; title: string; body: string; created_at: string };
export type Material = { id: string; subject_id: string; kind: "pyq" | "note"; title: string; path: string; created_at: string };
export type ParsedModule = { title: string; topics: string[] };
export type LibrarySubject = {
  id: string; owner_id: string; owner_name: string | null; name: string; code: string | null;
  branch: string | null; semester: string | null; syllabus: ParsedModule[]; imports: number;
};

"use client";
import Link from "next/link";
import { useState } from "react";
import { Check } from "@/components/Check";
import { Icon } from "@/components/Icons";
import type { Block } from "@/lib/rewards";
import type { Subject, Topic } from "@/lib/types";

export const fmtTime = (min: number) => {
  const h = Math.floor(min / 60) % 24, m = min % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

type Props = {
  start: number; end: number; day: string; block?: Block; subjects: Subject[]; topics: Topic[];
  maxBlocks: number; blockMinutes: number; canComplete: boolean; busy: boolean; onClose: () => void;
  onPlan: (subjectId: string, topicId: string | null, count: number) => void;
  onDone: (tickTopic: boolean) => void; onSkip: () => void; onClear: () => void; onUndo: () => void;
};

export default function BlockSheet(p: Props) {
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [count, setCount] = useState(1);
  const [tick, setTick] = useState(true);
  const b = p.block;
  const subject = p.subjects.find((s) => s.id === (b?.subject_id ?? subjectId));
  const topic = p.topics.find((t) => t.id === b?.topic_id);
  const pending = p.topics.filter((t) => t.subject_id === subjectId && !t.done);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={p.onClose} role="dialog" aria-modal="true" aria-label="Time block">
      <div className="max-h-[85vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">{fmtTime(p.start)} – {fmtTime(p.end)}</h2>
            <p className="text-xs text-slate-500">{p.blockMinutes} minute block</p>
          </div>
          <button aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={p.onClose}><Icon name="close" size={20} /></button>
        </div>

        {!b && (
          <>
            {p.subjects.length === 0 ? (
              <p className="text-sm text-slate-500">Add a subject first. <Link href="/subjects/new" className="text-brand underline">Add subject</Link></p>
            ) : (
              <>
                <div>
                  <div className="label">What will you study?</div>
                  <div className="flex flex-wrap gap-2">
                    {p.subjects.map((s) => (
                      <button key={s.id} type="button" aria-pressed={subjectId === s.id} onClick={() => { setSubjectId(s.id); setTopicId(""); }}
                        className={`flex max-w-full items-center gap-2 break-words rounded-xl border px-3 py-2 text-left text-sm ${subjectId === s.id ? "border-transparent text-white" : "border-slate-300 dark:border-slate-700"}`}
                        style={subjectId === s.id ? { background: s.color } : undefined}>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: subjectId === s.id ? "#fff" : s.color }} />{s.name}
                      </button>
                    ))}
                  </div>
                </div>
                {subjectId && pending.length > 0 && (
                  <div>
                    <label className="label" htmlFor="bt">Topic <span className="font-normal">(optional)</span></label>
                    <select id="bt" className="input" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                      <option value="">Any topic</option>
                      {pending.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="label !mb-0">How many blocks?</div>
                    <div className="text-xs text-slate-500">{count * p.blockMinutes} minutes in a row</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn-ghost !px-3" aria-label="Fewer blocks" disabled={count <= 1} onClick={() => setCount(count - 1)}>−</button>
                    <span className="w-6 text-center font-semibold tabular-nums">{count}</span>
                    <button type="button" className="btn-ghost !px-3" aria-label="More blocks" disabled={count >= p.maxBlocks} onClick={() => setCount(count + 1)}>+</button>
                  </div>
                </div>
                <button className="btn w-full !py-3" disabled={!subjectId || p.busy} onClick={() => p.onPlan(subjectId, topicId || null, count)}>
                  {subjectId ? `Plan ${count === 1 ? "this block" : `${count} blocks`}` : "Choose a subject"}
                </button>
              </>
            )}
          </>
        )}

        {b && (
          <>
            <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: (subject?.color ?? "#6366f1") + "22" }}>
              <span className="h-10 w-1.5 rounded-full" style={{ background: subject?.color ?? "#6366f1" }} />
              <div className="min-w-0">
                <div className="truncate font-medium">{subject?.name ?? "Study block"}</div>
                <div className="truncate text-xs text-slate-500">{topic ? topic.title : "Any topic"}</div>
              </div>
            </div>

            {b.status === "planned" && (
              <>
                {p.canComplete ? (
                  <>
                    {topic && !topic.done && (
                      <label className="flex items-center gap-3 text-sm">
                        <Check checked={tick} onChange={() => setTick(!tick)} color={subject?.color} label="Also tick off the topic" />
                        Also tick off “{topic.title}”
                      </label>
                    )}
                    <button className="btn w-full !py-3 text-base" disabled={p.busy} onClick={() => p.onDone(tick)}><Icon name="check" size={18} />I finished this block</button>
                  </>
                ) : <p className="text-sm text-slate-500">You can mark this block as finished on the day.</p>}
                <div className="flex gap-2">
                  {p.canComplete && <button className="btn-ghost flex-1" disabled={p.busy} onClick={p.onSkip}>Skip it</button>}
                  <button className="btn-ghost flex-1 text-red-600" disabled={p.busy} onClick={p.onClear}>Remove</button>
                </div>
              </>
            )}
            {b.status === "done" && (
              <>
                <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">Finished. You earned <b>{b.xp} XP</b>.</p>
                <button className="btn-ghost w-full" disabled={p.busy} onClick={p.onUndo}>Undo (it was not finished)</button>
              </>
            )}
            {b.status === "skipped" && (
              <>
                <p className="text-sm text-slate-500">You skipped this block.</p>
                <div className="flex gap-2">
                  <button className="btn flex-1" disabled={p.busy} onClick={p.onUndo}>Plan it again</button>
                  <button className="btn-ghost flex-1 text-red-600" disabled={p.busy} onClick={p.onClear}>Remove</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

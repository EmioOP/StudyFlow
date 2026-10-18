export default function ProgressBar({ value, color = "#6366f1", label = true }: { value: number; color?: string; label?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      {label && <span className="w-10 text-right text-xs tabular-nums text-slate-500">{value}%</span>}
    </div>
  );
}

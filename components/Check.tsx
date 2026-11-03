"use client";

/** Round-cornered checkbox in the subject's colour; the tick draws itself when checked. */
export function Check({ checked, onChange, color = "#6366f1", label, size = 24 }: {
  checked: boolean; onChange: () => void; color?: string; label: string; size?: number;
}) {
  return (
    <button
      type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={onChange}
      className="group relative shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
      style={{ width: size, height: size, ["--tw-ring-color" as string]: color }}
    >
      <span
        className={`absolute inset-0 rounded-lg border-2 transition-all duration-200 motion-reduce:transition-none ${checked ? "scale-100" : "border-slate-300 group-hover:border-slate-400 dark:border-slate-600"}`}
        style={checked ? { background: color, borderColor: color } : undefined}
      />
      <svg viewBox="0 0 24 24" className="relative" width={size} height={size} fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m6.5 12.5 3.8 3.8 7.2-8.1" strokeDasharray={20} strokeDashoffset={checked ? 0 : 20}
          style={{ transition: "stroke-dashoffset 220ms ease-out 60ms" }} className="motion-reduce:!transition-none" />
      </svg>
    </button>
  );
}

/** On/off switch for settings. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none ${checked ? "bg-brand" : "bg-slate-300 dark:bg-slate-700"}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 motion-reduce:transition-none ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

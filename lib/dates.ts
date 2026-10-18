export function todayStr(d = new Date()) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
export function daysUntil(dateStr: string, from = new Date()) {
  const a = new Date(todayStr(from) + "T00:00:00");
  const b = new Date(dateStr + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
export function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return todayStr(d);
}
export function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

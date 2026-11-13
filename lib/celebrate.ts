// Tiny event bus so any page can trigger confetti, floating XP, toasts and celebration modals.
export type ModalKind = "level" | "badge" | "goal" | "subject";
export type CelebrationModal = { kind: ModalKind; title: string; subtitle: string; icon?: string; color?: string };

function emit(name: string, detail: unknown) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(name, { detail }));
}
export const burst = (b: { x: number; y: number; count?: number; power?: number; color?: string }) => emit("sf:burst", b);
export const floatText = (x: number, y: number, text: string, color?: string) => emit("sf:float", { x, y, text, color });
export const toast = (text: string) => emit("sf:toast", { text });
export const showModal = (m: CelebrationModal) => emit("sf:modal", m);

export function centerOf(el: Element | null | undefined) {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 3 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

"use client";
import { useEffect, useRef, useState } from "react";
import type { CelebrationModal } from "@/lib/celebrate";
import { Icon, type IconName } from "@/components/Icons";

type P = { x: number; y: number; vx: number; vy: number; r: number; vr: number; w: number; h: number; c: string; life: number };
const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#8b5cf6"];
let uid = 0;

/** Mounted once in the root layout: draws confetti, floating "+XP", toasts and celebration pop-ups. */
export default function RewardLayer() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const parts = useRef<P[]>([]);
  const raf = useRef(0);
  const [floats, setFloats] = useState<{ id: number; x: number; y: number; text: string; color?: string }[]>([]);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [queue, setQueue] = useState<CelebrationModal[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cv = canvas.current!; const ctx = cv.getContext("2d")!;
    const resize = () => {
      const d = window.devicePixelRatio || 1;
      cv.width = window.innerWidth * d; cv.height = window.innerHeight * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    resize(); window.addEventListener("resize", resize);

    const frame = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      parts.current = parts.current.filter((p) => p.life > 0 && p.y < window.innerHeight + 40);
      for (const p of parts.current) {
        p.vy += 0.22; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 1;
        ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 25); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      }
      raf.current = parts.current.length ? requestAnimationFrame(frame) : 0;
    };
    const onBurst = (e: Event) => {
      if (reduced) return;
      const { x, y, count = 40, power = 1, color } = (e as CustomEvent).detail;
      const palette = color ? [color, color, ...COLORS] : COLORS;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, v = (3 + Math.random() * 6) * power;
        parts.current.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4 * power, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
          w: 5 + Math.random() * 5, h: 3 + Math.random() * 5, c: palette[Math.floor(Math.random() * palette.length)], life: 70 + Math.random() * 50 });
      }
      if (!raf.current) raf.current = requestAnimationFrame(frame);
    };
    const onFloat = (e: Event) => {
      const id = ++uid; const d = (e as CustomEvent).detail;
      setFloats((f) => [...f, { id, ...d }]); setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1500);
    };
    const onToast = (e: Event) => {
      const id = ++uid; const d = (e as CustomEvent).detail;
      setToasts((t) => [...t.slice(-2), { id, text: d.text }]); setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3300);
    };
    // wait a moment so the block fill and +XP pop are seen before the pop-up covers them
    const onModal = (e: Event) => { const m = (e as CustomEvent).detail; setTimeout(() => setQueue((q) => [...q, m]), 1100); };
    window.addEventListener("sf:burst", onBurst); window.addEventListener("sf:float", onFloat);
    window.addEventListener("sf:toast", onToast); window.addEventListener("sf:modal", onModal);
    return () => {
      window.removeEventListener("resize", resize); cancelAnimationFrame(raf.current);
      window.removeEventListener("sf:burst", onBurst); window.removeEventListener("sf:float", onFloat);
      window.removeEventListener("sf:toast", onToast); window.removeEventListener("sf:modal", onModal);
    };
  }, []);

  const modal = queue[0];
  useEffect(() => {
    if (modal) window.dispatchEvent(new CustomEvent("sf:burst", { detail: { x: window.innerWidth / 2, y: window.innerHeight / 3, count: 90, power: 1.4 } }));
  }, [modal]);

  return (
    <>
      <canvas ref={canvas} className="pointer-events-none fixed inset-0 z-[70]" aria-hidden="true" />
      {floats.map((f) => (
        <div key={f.id} className="sf-float pointer-events-none fixed z-[71] whitespace-nowrap text-lg font-extrabold drop-shadow" style={{ left: f.x, top: f.y, color: f.color ?? "#f59e0b" }}>{f.text}</div>
      ))}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[72] md:bottom-8" aria-live="polite">
        {toasts.map((t, i) => (
          <div key={t.id} className="sf-toast absolute left-1/2 max-w-[90vw] rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-slate-900" style={{ bottom: i * 44 }}>{t.text}</div>
        ))}
      </div>
      {modal && (
        <div className="fixed inset-0 z-[73] flex items-center justify-center bg-black/50 p-6" role="dialog" aria-modal="true" aria-label={modal.title} onClick={() => setQueue((q) => q.slice(1))}>
          <div className="sf-pop w-full max-w-xs space-y-3 rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-white" style={{ background: modal.color ?? "#6366f1" }}>
              <Icon name={(modal.icon as IconName) ?? "star"} size={40} />
            </div>
            <h2 className="text-xl font-bold">{modal.title}</h2>
            <p className="text-sm text-slate-500">{modal.subtitle}</p>
            <button autoFocus className="btn w-full" onClick={() => setQueue((q) => q.slice(1))}>{queue.length > 1 ? "Next" : "Keep going"}</button>
          </div>
        </div>
      )}
    </>
  );
}

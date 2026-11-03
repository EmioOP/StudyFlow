"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function PwaSetup() {
  const [offline, setOffline] = useState(false);
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    setOffline(!navigator.onLine);
    const on = () => setOffline(false), off = () => setOffline(true);
    window.addEventListener("online", on); window.addEventListener("offline", off);

    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    let dismissed = false;
    try { dismissed = localStorage.getItem("sf-install-dismissed") === "1"; } catch {}
    setHidden(standalone || dismissed);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIos) setIosHint(true);

    const before = (e: Event) => { e.preventDefault(); setInstallEvt(e as InstallEvent); };
    const installed = () => { setInstallEvt(null); setHidden(true); };
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("online", on); window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", before); window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const dismiss = () => { setHidden(true); try { localStorage.setItem("sf-install-dismissed", "1"); } catch {} };

  return (
    <>
      {offline && <div className="fixed inset-x-0 top-0 z-50 bg-amber-500 py-1 text-center text-xs font-medium text-white">You&apos;re offline — changes won&apos;t save until you reconnect</div>}
      {!hidden && (installEvt || iosHint) && (
        <div className="fixed inset-x-3 bottom-20 z-40 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900 md:bottom-4 md:left-auto md:max-w-sm">
          <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
          <div className="min-w-0 flex-1">
            <div className="font-medium">Install StudyFlow</div>
            <div className="text-xs text-slate-500">{installEvt ? "Add it to your home screen for quick access." : "Tap Share, then “Add to Home Screen”."}</div>
          </div>
          {installEvt && <button className="btn !px-3" onClick={async () => { await installEvt.prompt(); const r = await installEvt.userChoice; if (r.outcome === "accepted") setHidden(true); setInstallEvt(null); }}>Install</button>}
          <button className="text-slate-400" aria-label="Dismiss" onClick={dismiss}><Icon name="close" size={18} /></button>
        </div>
      )}
    </>
  );
}

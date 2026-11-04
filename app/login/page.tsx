"use client";
import { supabase, isConfigured } from "@/lib/supabase";
import { Logo } from "@/components/Icons";

export default function Login() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex items-center gap-3"><Logo size={44} /><span className="text-2xl font-bold">StudyFlow</span></div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight">Know exactly what is left to study</h1>
        <p className="text-slate-500">Add your subjects and syllabus, tick topics off, and see your progress before every exam.</p>
      </div>
      {!isConfigured && <p className="card text-sm">Supabase is not configured yet. Add your keys to <code>.env.local</code>.</p>}
      <div className="space-y-2">
        <button
          className="btn w-full !py-3 text-base"
          disabled={!isConfigured}
          onClick={() => supabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } })}
        >
          Continue with Google
        </button>
        <p className="text-center text-xs text-slate-500">No password needed. Your subjects and notes are private to you.</p>
      </div>
    </main>
  );
}

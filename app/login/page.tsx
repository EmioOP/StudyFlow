"use client";
import { supabase, isConfigured } from "@/lib/supabase";

export default function Login() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-3xl font-bold text-brand">StudyFlow</div>
      <p className="text-sm text-slate-500">Plan your exams, track every topic, share syllabi with classmates.</p>
      {!isConfigured && <p className="card text-sm">Supabase is not configured yet. Add keys to <code>.env.local</code>.</p>}
      <button
        className="btn w-full"
        disabled={!isConfigured}
        onClick={() => supabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } })}
      >
        Continue with Google
      </button>
    </main>
  );
}

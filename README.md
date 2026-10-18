# StudyFlow (placeholder name)

Exam study manager: timetable → subjects → syllabus → topic todos → completion %.
Includes countdown + daily plan, Pomodoro timer + study log, priority/difficulty + spaced revision,
notes & previous question papers, and a shared syllabus library. Next.js 15 + Supabase, mobile-first PWA.

## Setup
1. Create a project at https://supabase.com.
2. SQL editor → paste and run `supabase/schema.sql` (tables, row-level security, private storage bucket).
3. Authentication → Providers → enable **Google** (create OAuth client in Google Cloud Console; add the callback URL Supabase shows).
4. Authentication → URL Configuration → add `http://localhost:3000/auth/callback` (and your deployed URL) to Redirect URLs.
5. `cp .env.example .env.local` and fill in Project URL + anon key (Project settings → API).
6. `npm install && npm run dev`, open http://localhost:3000.

## Notes
- Progress % = done topics ÷ total topics. Revisions are scheduled 3, 7 and 14 days after a topic is completed.
- Daily plan = remaining topics ÷ days left before each exam (high priority/difficulty first) + due revisions.
- PDF import works on text PDFs (not scanned images); always review the preview before saving.
- `npm test` runs the syllabus parser tests.

# Stride — CLAUDE.md

This file is the single source of truth for the Stride project.
Update it after every significant change to the codebase, schema, or product direction.

---

## Project Overview

**Name:** Stride
**Goal:** Help students manage pre-exam work overload by creating realistic, adaptive
study plans based on their actual reading/study pace and automatic delay recalculation.

**Core problem it solves:** Students underestimate how long studying takes, fall behind,
and panic before exams. Stride breaks study material into achievable daily chunks and
automatically re-plans when the user slips behind.

**Target users:** Students dealing with exam pressure and multiple subjects simultaneously.

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Framework  | Next.js (latest stable, App Router, TypeScript) |
| Styling    | Tailwind CSS                            |
| PWA        | next-pwa (offline support required)     |
| Icons      | Lucide React                            |
| Database   | Supabase (PostgreSQL + Auth + Realtime) |
| AI         | OpenAI API + Google Gemini API          |
| Deployment | Vercel                                  |

**TypeScript is mandatory.** No plain `.js` files in `src/`.

---

## Database Schema (Supabase)

```sql
-- Users (extended from Supabase Auth)
profiles (
  id          uuid references auth.users primary key,
  name        text,
  night_start time default '23:00',
  night_end   time default '07:00',
  created_at  timestamptz default now()
)

-- Exams
exams (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references profiles(id),
  subject       text not null,
  exam_date     date not null,
  priority      integer default 1,   -- higher = more important; used to weight scheduling
  revision_days integer default 1,   -- days before exam blocked for revision only (no new material)
  created_at    timestamptz default now()
)

-- Study materials (books, slides, notes, etc.)
study_materials (
  id           uuid primary key default gen_random_uuid(),
  exam_id      uuid references exams(id),
  title        text not null,
  type         text check (type in ('book','slides','notes','other')),
  total_units  integer not null,
  unit_label   text default 'page',  -- 'page', 'slide', 'note', etc.
  created_at   timestamptz default now()
)

-- Study sessions (records of actual work done)
study_sessions (
  id              uuid primary key default gen_random_uuid(),
  material_id     uuid references study_materials(id),
  user_id         uuid references profiles(id),
  units_completed integer not null,
  time_spent_sec  integer not null,
  session_date    date not null,
  created_at      timestamptz default now()
)

-- Calendar: blocks of time unavailable for studying
calendar_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id),
  title       text,
  start_time  timestamptz not null,
  end_time    timestamptz not null,
  created_at  timestamptz default now()
)

-- Generated schedule slots
schedules (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id),
  material_id  uuid references study_materials(id),
  slot_date    date not null,
  units_target integer not null,
  is_done      boolean default false,
  created_at   timestamptz default now()
)
```

---

## Core Rescheduling Algorithm

### Pace Estimation
After each timed session, Stride calculates the user's pace per material:

```
pace (units/min) = units_completed / (time_spent_sec / 60)
```

Averaged across recent sessions per material. A global fallback pace is used
when no session data exists yet (default: 1 unit/min, user-configurable).

### Scheduling
When (re)scheduling, Stride:

1. **Calculates remaining units** per material:
   ```
   remaining = total_units - SUM(units_completed)
   ```

2. **Finds available time slots** between now and exam date:
   - Fetches all `calendar_events` and subtracts blocked time from each day
   - Subtracts nighttime window (`night_start` → `night_end` from user profile)
   - Result: list of `(date, available_minutes)` pairs

3. **Blocks revision days:** The last `revision_days` days before each exam are reserved for
   review only. No new material is scheduled into those slots.

4. **Distributes work** across remaining available slots, weighted by exam priority:
   ```
   weight = exam.priority / SUM(all active exam priorities)
   units_for_slot = available_minutes_in_slot × pace (units/min) × weight
   ```
   Higher-priority exams receive proportionally more of each day's available time.
   Slots are filled day by day until `remaining` reaches 0 for each material.

5. **Slip-up detection (automatic):** At day-end (or on next app open after midnight),
   Stride checks for `schedules` rows with `is_done = false` and `slot_date < today`.
   Unfinished units are redistributed across remaining future slots.

**Edge cases:**
- No time remaining before exam → surface a warning, do not crash
- First-time user with no pace data → use default pace, update after first session
- Material fully completed → skip in scheduling

---

## Key Features

### Smart Timer
- Pomodoro-style timer tied to a specific study material and session
- Records `units_completed` and `time_spent_sec` on completion
- Updates pace estimate after each session
- Must work offline (PWA)

### Focus Mode
- Minimalist full-screen UI — only the timer and current task visible
- Hides navigation and suppresses in-app notifications

### Automatic Delay Recalculation
- Runs on next app open after midnight (or via background sync)
- Detects missed sessions, redistributes work across remaining slots
- User sees a slip-up alert with the updated plan

### AI Summaries
- Triggered manually by the user per material/chapter
- Supports OpenAI and Gemini (abstracted behind a single interface, auto-fallback)
- User pastes or uploads text → summary saved to Supabase
- Summaries are stored, never regenerated on every render

### Exam Priority Weighting
- User sets a priority level (integer) per exam when creating or editing it
- Scheduler allocates proportionally more daily study time to higher-priority subjects
- All active exams compete for the same available time pool, weighted by priority

### Revision Day Scheduling
- User sets `revision_days` per exam (e.g. 2 = block the 2 days before the exam)
- Those days are reserved for review only — no new material is scheduled into them
- Revision days are where AI quizzes will surface (when implemented)

### Streak Tracking
- Counts consecutive days where the user completed at least one scheduled session
- Days with nothing scheduled do **not** break the streak
- Displayed on the dashboard as a motivational indicator

### Crunch Mode Warning
- Triggered when: `remaining_units / remaining_available_minutes > user's historical pace`
- Surfaces a prominent warning: "At your current pace you won't finish in time"
- Does not block the user — informs and lets them decide (add time, reduce material, etc.)

### Low Energy Day
- User can mark today as a low energy day (capped at 1–2 per week)
- Halves the units target for that day; remainder is redistributed across future slots
- Before confirming, shows the cost: "This adds X units/day for the rest of the week"
- If redistribution would make the plan infeasible, warns the user instead of applying it

### AI Quizzes *(stretch goal)*
- Available on revision days
- Generates questions from stored summary text
- Implement after summaries are stable

---

## PWA Requirements

**Priority 1 — Basic PWA (implement first):**
- App installable (Web App Manifest: name "Stride", theme color matching design system)
- Service worker set up with next-pwa
- Timer works offline (no network dependency during a session)

**Priority 2 — Full offline sync (implement after core features are stable):**
- Service worker caches schedule data and active session state
- Background sync to flush completed sessions when back online
- Offline-capable schedule viewing

---

## Project Structure (target)

```
src/
  app/                  # Next.js App Router pages
    (auth)/             # Login / signup
    dashboard/          # Main view: today's plan
    focus/              # Focus mode
    materials/          # Manage study materials
    settings/           # Nighttime window, pace defaults
    api/                # API route handlers
  components/           # Shared UI components
  lib/
    supabase/           # Supabase client + typed helpers
    ai/                 # OpenAI + Gemini wrappers (single interface)
    scheduler/          # Core rescheduling algorithm (pure TS, no React)
    timer/              # Timer logic (runs offline in service worker)
  types/                # Shared TypeScript types
  hooks/                # Custom React hooks
```

---

## Development Commands

```bash
npm run dev        # Start local dev server (http://localhost:3000)
npm run build      # Production build
npm run start      # Start production server locally
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

---

## AI Integration Notes

- Abstract OpenAI and Gemini behind a single `lib/ai/` interface — provider swappable
- Focus: **summaries first**, quizzes later
- Never send user data to AI without an explicit user action (button press)
- Store generated summaries in Supabase — do not regenerate on render

---

## Current Status

**Phase: Project initialization and environment setup**

- [x] Next.js project scaffolded with TypeScript + Tailwind + App Router
- [x] Supabase project created and schema migrated
- [x] `.env.local` configured with Supabase URL and anon key
- [ ] next-pwa configured
- [ ] Vercel project linked

---

## Roadmap

1. **Logic setup** — Scheduler algorithm, Supabase schema, auth
2. **Timer component** — Smart Timer with offline support, session recording
3. **Dashboard UI** — Today's plan, progress, slip-up alerts
4. **Focus Mode** — Distraction-free full-screen timer
5. **AI Summaries** — OpenAI/Gemini integration, summary storage
6. **AI Quizzes** — Revision day quiz generation *(stretch)*

---

## Conventions

- **App Router only.** No `pages/` directory.
- All DB queries go through typed Supabase helpers in `lib/supabase/` — no raw SQL in components.
- Scheduler logic is **pure TypeScript** (no React) so it can be unit-tested and run in a service worker.
- Time is stored in **UTC** in the database. Convert to local time only in the UI layer.
- `unit_label` (page, slide, note) is display-only. All math uses plain integers.

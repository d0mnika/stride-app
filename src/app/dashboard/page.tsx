import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import AppNav from '@/components/AppNav'
import {
  getProfile, getExams, getAllMaterials, getSessionsByUser,
  getCalendarEvents, getRecurringEvents, getSchedules, replaceSchedule,
  getBlockedDays,
} from '@/lib/supabase/helpers'
import {
  todayStr, addDays, computeAvailableDays, expandRecurringEvents,
  generateSchedule, detectSlipUps, checkCrunchMode, calculateStreak,
  calculateRemaining, type AvailableDay,
} from '@/lib/scheduler'
import type { ScheduleInsert } from '@/types'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const today = todayStr()

  const [profile, exams, materials, sessions, calendarEvents] = await Promise.all([
    getProfile(supabase, user.id),
    getExams(supabase, user.id),
    getAllMaterials(supabase),
    getSessionsByUser(supabase, user.id),
    getCalendarEvents(supabase, user.id, today, addDays(today, 180)),
  ])

  // These tables are added in migrations 0002/0003 — fall back to [] if not applied yet
  let recurringEvents: Awaited<ReturnType<typeof getRecurringEvents>> = []
  let blockedDays: Awaited<ReturnType<typeof getBlockedDays>> = []
  try {
    ;[recurringEvents, blockedDays] = await Promise.all([
      getRecurringEvents(supabase, user.id),
      getBlockedDays(supabase, user.id, today, addDays(today, 180)),
    ])
  } catch { /* migrations not yet applied */ }

  const nightStart        = profile?.night_start         ?? '23:00'
  const nightEnd          = profile?.night_end           ?? '07:00'
  const dailyStudyMinutes = profile?.daily_study_minutes ?? 120
  const maxSubjectsPerDay = profile?.max_subjects_per_day ?? null

  // Compute available days once — reused for schedule gen and crunch check
  let availableDays: AvailableDay[] = []
  if (exams.length > 0) {
    const maxExamDate  = exams.reduce((max, e) => e.exam_date > max ? e.exam_date : max, today)
    const expanded     = expandRecurringEvents(recurringEvents, today, addDays(maxExamDate, 1))
    const blockedSet   = new Set(blockedDays.map(b => b.blocked_date))
    availableDays = computeAvailableDays(
      today, addDays(maxExamDate, 1), [...calendarEvents, ...expanded], nightStart, nightEnd
    )
      .filter(d => !blockedSet.has(d.date))
      .map(d => ({ ...d, availableMinutes: Math.min(d.availableMinutes, dailyStudyMinutes) }))
  }

  let allSchedules = await getSchedules(supabase, user.id, addDays(today, -90), addDays(today, 180))

  // Auto-generate schedule on first visit or when all future slots are consumed.
  const hasRemainingWork     = materials.some(m => calculateRemaining(m, sessions) > 0)
  const needsRegen           = hasRemainingWork && !allSchedules.some(s => s.slot_date > today) && exams.length > 0 && availableDays.length > 0
  const doneMaterialIdsToday = new Set(
    allSchedules.filter(s => s.slot_date === today && s.is_done).map(s => s.material_id)
  )

  if (needsRegen) {
    const newSlots = generateSchedule({
      exams, materials, sessions, availableDays, defaultPaceUnitsPerMin: 1, maxSubjectsPerDay,
    })
    const toInsert: ScheduleInsert[] = newSlots
      .filter(s => !(s.slot_date === today && doneMaterialIdsToday.has(s.material_id)))
      .map(s => ({
        user_id: user.id,
        material_id: s.material_id,
        slot_date: s.slot_date,
        units_target: s.units_target,
        is_done: false,
      }))
    await replaceSchedule(supabase, user.id, today, toInsert)
    allSchedules = await getSchedules(supabase, user.id, addDays(today, -90), addDays(today, 180))
  }

  const todaySlots = allSchedules.filter(s => s.slot_date === today)
  const slipUps    = detectSlipUps(allSchedules, today)
  const streak     = calculateStreak(allSchedules, sessions, today)

  // Crunch warnings — TODO: gate behind premium subscription when billing is added
  const rawWarnings = exams.length > 0 && materials.length > 0 && availableDays.length > 0
    ? checkCrunchMode({ exams, materials, sessions, availableDays, defaultPaceUnitsPerMin: 1 })
    : []

  // Infinity doesn't survive RSC serialization (becomes null) — convert explicitly
  const crunchWarnings = rawWarnings.map(w => ({
    ...w,
    pace_needed_units_per_min: Number.isFinite(w.pace_needed_units_per_min)
      ? w.pace_needed_units_per_min
      : null,
  }))

  return (
    <main className="min-h-screen bg-[#F5F1EB]">
      <AppNav current="/dashboard" userInitial={user.email?.[0].toUpperCase()} />
      <div className="max-w-3xl mx-auto px-6 pt-10 pb-16">
        <h1 className="font-palatino text-3xl font-bold text-[#3D2B26] mb-8">Dashboard</h1>

        <DashboardClient
          todaySlots={todaySlots}
          slipUps={slipUps}
          exams={exams}
          materials={materials}
          sessions={sessions}
          streak={streak}
          crunchWarnings={crunchWarnings}
          plan={profile?.plan ?? 'free'}
          dailyStudyMinutes={dailyStudyMinutes}
        />
      </div>
    </main>
  )
}


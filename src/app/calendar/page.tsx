import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import AppNav from '@/components/AppNav'
import {
  getProfile, getRecurringEvents, getCalendarEvents,
  getStudyBlocksForDateRange, getSchedules, getSessionsByUser,
  getExams, getAllMaterials, getBlockedDays,
} from '@/lib/supabase/helpers'
import { todayStr, addDays } from '@/lib/scheduler'
import type { Schedule, StudySession, StudyMaterial, Exam } from '@/types'
import CalendarClient from './CalendarClient'

function timeToMin(t: string): number {
  const parts = t.split(':').map(Number)
  return parts[0] * 60 + parts[1]
}

export interface ScheduledMaterialInfo {
  material_id: string
  title: string
  exam_id: string
  durationMin: number
}

function computeScheduledMaterialsByDate(
  schedules: Schedule[],
  materials: StudyMaterial[],
  sessions: StudySession[],
  exams: Exam[],
  dailyStudyMinutes: number,
): Record<string, ScheduledMaterialInfo[]> {
  const paceByMaterial = new Map<string, number>()
  const sessionsByMaterial = new Map<string, StudySession[]>()
  for (const s of sessions) {
    const list = sessionsByMaterial.get(s.material_id) ?? []
    list.push(s)
    sessionsByMaterial.set(s.material_id, list)
  }
  for (const [matId, matSessions] of sessionsByMaterial) {
    const totalUnits = matSessions.reduce((n, s) => n + s.units_completed, 0)
    const totalMin   = matSessions.reduce((n, s) => n + s.time_spent_sec, 0) / 60
    if (totalMin > 0 && totalUnits > 0) paceByMaterial.set(matId, totalUnits / totalMin)
  }

  // Pre-group undone slots by date so we can compute proportional durations
  const unitsByDate = new Map<string, number>()
  for (const slot of schedules) {
    if (slot.is_done) continue
    unitsByDate.set(slot.slot_date, (unitsByDate.get(slot.slot_date) ?? 0) + slot.units_target)
  }

  const materialById = new Map(materials.map(m => [m.id, m]))
  const examById     = new Map(exams.map(e => [e.id, e]))

  const result: Record<string, ScheduledMaterialInfo[]> = {}
  for (const slot of schedules) {
    if (slot.is_done) continue
    const material = materialById.get(slot.material_id)
    if (!material) continue
    const exam = examById.get(material.exam_id)
    if (!exam) continue

    const pace = paceByMaterial.get(slot.material_id)
    let durationMin: number
    if (pace) {
      // Real measured pace: derive duration from units
      durationMin = Math.max(5, slot.units_target / pace)
    } else {
      // No sessions yet: show proportional share of the daily study goal.
      // This avoids the misleading "9 min" that comes from treating units as minutes.
      const totalUnitsToday = unitsByDate.get(slot.slot_date) ?? slot.units_target
      const proportion = totalUnitsToday > 0 ? slot.units_target / totalUnitsToday : 1
      durationMin = Math.max(5, proportion * dailyStudyMinutes)
    }

    if (!result[slot.slot_date]) result[slot.slot_date] = []
    result[slot.slot_date].push({
      material_id: slot.material_id,
      title: material.title,
      exam_id: material.exam_id,
      durationMin,
    })
  }

  // Sort within each day: higher exam priority first
  for (const date of Object.keys(result)) {
    result[date].sort((a, b) => {
      const pa = examById.get(a.exam_id)?.priority ?? 1
      const pb = examById.get(b.exam_id)?.priority ?? 1
      return pb - pa
    })
  }

  return result
}

export default async function CalendarPage() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const today = todayStr()

  const [profile, recurringEvents, calendarEvents, savedStudyBlocks, schedules, sessions, exams, materials, blockedDays] = await Promise.all([
    getProfile(supabase, user.id),
    getRecurringEvents(supabase, user.id),
    getCalendarEvents(supabase, user.id, addDays(today, -30), addDays(today, 180)),
    getStudyBlocksForDateRange(supabase, user.id, addDays(today, -7), addDays(today, 180)),
    getSchedules(supabase, user.id, addDays(today, -7), addDays(today, 180)),
    getSessionsByUser(supabase, user.id),
    getExams(supabase, user.id),
    getAllMaterials(supabase),
    getBlockedDays(supabase, user.id, addDays(today, -7), addDays(today, 180)),
  ])

  const nightStartMin     = timeToMin(profile?.night_start          ?? '23:00')
  const nightEndMin       = timeToMin(profile?.night_end            ?? '07:00')
  const breakLengthMin    = profile?.break_length_minutes           ?? 30
  const bufferMin         = profile?.buffer_minutes                 ?? 60
  const dailyStudyMinutes = profile?.daily_study_minutes            ?? 120

  const scheduledMaterialsByDate = computeScheduledMaterialsByDate(schedules, materials, sessions, exams, dailyStudyMinutes)

  // Stable exam order: higher priority first, then earlier exam date
  const sortedExams = [...exams].sort((a, b) =>
    b.priority - a.priority || a.exam_date.localeCompare(b.exam_date)
  )
  const examIds     = sortedExams.map(e => e.id)
  const examSubjects = Object.fromEntries(exams.map(e => [e.id, e.subject]))

  return (
    <main className="min-h-screen bg-[#F5F1EB]">
      <AppNav current="/calendar" userInitial={user.email?.[0].toUpperCase()} />
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-16">
        <h1 className="font-palatino text-3xl font-bold text-[#3D2B26] mb-8">Calendar</h1>

        <CalendarClient
          recurringEvents={recurringEvents}
          calendarEvents={calendarEvents}
          savedStudyBlocks={savedStudyBlocks}
          blockedDates={blockedDays.map(b => b.blocked_date)}
          today={today}
          nightStartMin={nightStartMin}
          nightEndMin={nightEndMin}
          breakLengthMin={breakLengthMin}
          bufferMin={bufferMin}
          dailyStudyMinutes={dailyStudyMinutes}
          scheduledMaterialsByDate={scheduledMaterialsByDate}
          examIds={examIds}
          examSubjects={examSubjects}
        />
      </div>
    </main>
  )
}

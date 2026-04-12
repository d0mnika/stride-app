// Core scheduling logic — pure TypeScript, no React, no Supabase imports.
// Can be unit-tested standalone and run inside a service worker.

import type { Exam, StudyMaterial, StudySession, CalendarEvent, Schedule } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AvailableDay {
  date: string          // YYYY-MM-DD
  availableMinutes: number
}

export interface SchedulerInput {
  exams: Exam[]
  materials: StudyMaterial[]
  sessions: StudySession[]
  availableDays: AvailableDay[]
  defaultPaceUnitsPerMin: number
}

export interface ScheduleSlot {
  material_id: string
  slot_date: string     // YYYY-MM-DD
  units_target: number
}

export interface CrunchWarning {
  material_id: string
  exam_subject: string
  remaining_units: number
  available_minutes: number
  pace_units_per_min: number        // user's measured (or default) pace
  pace_needed_units_per_min: number // pace required to finish on time
}

// ─── Date utilities ───────────────────────────────────────────────────────────

// Returns YYYY-MM-DD for today in local time.
export function todayStr(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Adds (or subtracts) days from a YYYY-MM-DD string. Uses UTC noon to dodge DST.
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 12))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// Parses "HH:MM" or "HH:MM:SS" → total minutes since midnight.
function parseTimeMinutes(t: string): number {
  const parts = t.split(':').map(Number)
  return parts[0] * 60 + parts[1]
}

// ─── Pace ─────────────────────────────────────────────────────────────────────

// Computes units/min for a material from recorded sessions.
// Falls back to defaultPace when there's no data or zero time recorded.
export function calculatePace(
  sessions: StudySession[],
  materialId: string,
  defaultPace: number
): number {
  const relevant = sessions.filter(s => s.material_id === materialId)
  if (relevant.length === 0) return defaultPace

  const totalUnits = relevant.reduce((n, s) => n + s.units_completed, 0)
  const totalMinutes = relevant.reduce((n, s) => n + s.time_spent_sec, 0) / 60

  if (totalMinutes === 0 || totalUnits === 0) return defaultPace
  return totalUnits / totalMinutes
}

// ─── Remaining units ──────────────────────────────────────────────────────────

export function calculateRemaining(material: StudyMaterial, sessions: StudySession[]): number {
  const completed = sessions
    .filter(s => s.material_id === material.id)
    .reduce((n, s) => n + s.units_completed, 0)
  return Math.max(0, material.total_units - completed)
}

// ─── Available day computation ────────────────────────────────────────────────

// Builds an AvailableDay array for every date between startDate and endDate (inclusive).
// Subtracts nighttime and any overlapping calendar events from each day's minutes.
//
// Note on timezones: calendar_events are stored as UTC timestamptz. This function
// compares event boundaries against UTC midnight boundaries of each date string,
// which is consistent as long as the UI converts local times to UTC before saving.
export function computeAvailableDays(
  startDate: string,
  endDate: string,
  calendarEvents: CalendarEvent[],
  nightStart: string, // "HH:MM" or "HH:MM:SS" in local time as set by user
  nightEnd: string
): AvailableDay[] {
  const nightStartMin = parseTimeMinutes(nightStart)
  const nightEndMin = parseTimeMinutes(nightEnd)

  // Night may span midnight (e.g., 23:00 → 07:00)
  const nightMinutes =
    nightStartMin > nightEndMin
      ? 24 * 60 - nightStartMin + nightEndMin
      : nightEndMin - nightStartMin

  const dayWindowMinutes = 24 * 60 - nightMinutes
  const result: AvailableDay[] = []

  let current = startDate
  while (current <= endDate) {
    // UTC day boundaries for this date string
    const dayStartMs = Date.UTC(...(current.split('-').map(Number) as [number, number, number]), -1, 0, 0, 0)
    // Simpler: parse as UTC midnight
    const [cy, cm, cd] = current.split('-').map(Number)
    const dayStartUTC = Date.UTC(cy, cm - 1, cd, 0, 0, 0, 0)
    const dayEndUTC   = Date.UTC(cy, cm - 1, cd, 23, 59, 59, 999)

    const blockedByEvents = calendarEvents.reduce((total, ev) => {
      const evStart = new Date(ev.start_time).getTime()
      const evEnd   = new Date(ev.end_time).getTime()
      if (evStart > dayEndUTC || evEnd < dayStartUTC) return total // no overlap

      const overlapStart = Math.max(evStart, dayStartUTC)
      const overlapEnd   = Math.min(evEnd, dayEndUTC)
      return total + (overlapEnd - overlapStart) / 60_000
    }, 0)

    result.push({
      date: current,
      availableMinutes: Math.max(0, dayWindowMinutes - blockedByEvents),
    })

    current = addDays(current, 1)
  }

  return result
}

// ─── Low energy day ───────────────────────────────────────────────────────────

// Returns a new AvailableDay array with the target date's minutes halved.
// Call before generateSchedule; the caller is responsible for the redistribution
// warning ("this adds X units/day") by comparing total units before and after.
export function applyLowEnergyDay(days: AvailableDay[], date: string): AvailableDay[] {
  return days.map(d =>
    d.date === date ? { ...d, availableMinutes: Math.floor(d.availableMinutes / 2) } : d
  )
}

// ─── Core scheduler ───────────────────────────────────────────────────────────

// Generates study schedule slots from today forward.
//
// Algorithm:
//  For each available day (chronological):
//    1. Determine active exams (those with remaining material whose study window covers this day)
//    2. Split available minutes proportionally by exam priority
//    3. Within each exam, split that exam's minutes proportionally by remaining units per material
//    4. Convert minutes → units using the material's pace
//    5. Emit a ScheduleSlot (capped at remaining units)
//
// Revision days and completed materials are automatically skipped.
export function generateSchedule(input: SchedulerInput): ScheduleSlot[] {
  const slots: ScheduleSlot[] = []

  const examById = new Map(input.exams.map(e => [e.id, e]))

  const materialsByExam = new Map<string, StudyMaterial[]>()
  for (const m of input.materials) {
    const list = materialsByExam.get(m.exam_id) ?? []
    list.push(m)
    materialsByExam.set(m.exam_id, list)
  }

  // Track remaining units — modified in place as slots are emitted
  const remaining = new Map<string, number>()
  for (const m of input.materials) {
    const rem = calculateRemaining(m, input.sessions)
    if (rem > 0) remaining.set(m.id, rem)
  }

  const paceFor = new Map<string, number>()
  for (const m of input.materials) {
    paceFor.set(m.id, calculatePace(input.sessions, m.id, input.defaultPaceUnitsPerMin))
  }

  const sortedDays = [...input.availableDays].sort((a, b) => a.date.localeCompare(b.date))

  for (const day of sortedDays) {
    if (remaining.size === 0) break
    if (day.availableMinutes <= 0) continue

    // Exams that still have work AND whose study window includes this day.
    // Last study day = exam_date - (revision_days + 1):
    //   e.g. exam June 1, revision_days 2 → last study day May 29
    const activeExams = input.exams.filter(exam => {
      const lastStudyDate = addDays(exam.exam_date, -(exam.revision_days + 1))
      if (day.date > lastStudyDate) return false
      return (materialsByExam.get(exam.id) ?? []).some(m => (remaining.get(m.id) ?? 0) > 0)
    })

    if (activeExams.length === 0) continue

    const totalPriority = activeExams.reduce((n, e) => n + e.priority, 0)

    for (const exam of activeExams) {
      const examShare = (exam.priority / totalPriority) * day.availableMinutes

      const activeMaterials = (materialsByExam.get(exam.id) ?? []).filter(
        m => (remaining.get(m.id) ?? 0) > 0
      )
      if (activeMaterials.length === 0) continue

      const totalRemForExam = activeMaterials.reduce((n, m) => n + (remaining.get(m.id) ?? 0), 0)

      for (const material of activeMaterials) {
        const matRem     = remaining.get(material.id) ?? 0
        const matShare   = (matRem / totalRemForExam) * examShare
        const pace       = paceFor.get(material.id) ?? input.defaultPaceUnitsPerMin
        const unitsTarget = Math.min(Math.floor(matShare * pace), matRem)

        if (unitsTarget <= 0) continue

        slots.push({ material_id: material.id, slot_date: day.date, units_target: unitsTarget })

        const newRem = matRem - unitsTarget
        if (newRem === 0) remaining.delete(material.id)
        else remaining.set(material.id, newRem)
      }
    }
  }

  return slots
}

// ─── Slip-up detection ────────────────────────────────────────────────────────

// Returns schedule rows that were supposed to be done before today but weren't.
// The caller should show a warning, then call generateSchedule() again to rebuild
// from today — incomplete units are automatically redistributed since calculateRemaining
// uses actual session data, not schedule targets.
export function detectSlipUps(schedules: Schedule[], today: string): Schedule[] {
  return schedules.filter(s => !s.is_done && s.slot_date < today)
}

// ─── Crunch mode ─────────────────────────────────────────────────────────────

// Returns a warning for each material where the user's pace is too slow to finish
// all remaining units within the available time before the exam.
export function checkCrunchMode(input: SchedulerInput): CrunchWarning[] {
  const warnings: CrunchWarning[] = []
  const examById = new Map(input.exams.map(e => [e.id, e]))

  for (const material of input.materials) {
    const rem = calculateRemaining(material, input.sessions)
    if (rem === 0) continue

    const exam = examById.get(material.exam_id)
    if (!exam) continue

    const lastStudyDate = addDays(exam.exam_date, -(exam.revision_days + 1))
    const relevantDays = input.availableDays.filter(d => d.date <= lastStudyDate)
    const totalAvailMin = relevantDays.reduce((n, d) => n + d.availableMinutes, 0)
    const pace = calculatePace(input.sessions, material.id, input.defaultPaceUnitsPerMin)
    const canComplete = totalAvailMin * pace

    if (canComplete < rem) {
      warnings.push({
        material_id: material.id,
        exam_subject: exam.subject,
        remaining_units: rem,
        available_minutes: totalAvailMin,
        pace_units_per_min: pace,
        pace_needed_units_per_min: totalAvailMin > 0 ? rem / totalAvailMin : Infinity,
      })
    }
  }

  return warnings
}

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
  maxSubjectsPerDay?: number | null
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

// ─── Recurring event expansion ───────────────────────────────────────────────

// Expands recurring weekly events into concrete time blocks for a date range.
// Times are treated as local-clock times (consistent with how todayStr works).
// Returns objects shaped like CalendarEvent so they can be merged with one-off
// events and passed directly to computeAvailableDays.
export function expandRecurringEvents(
  recurring: Array<{ day_of_week: number; start_time: string; end_time: string }>,
  startDate: string,
  endDate: string
): Array<{ start_time: string; end_time: string; id: string; user_id: string; title: string | null; created_at: string }> {
  const result: Array<{ start_time: string; end_time: string; id: string; user_id: string; title: string | null; created_at: string }> = []
  let current = startDate
  while (current <= endDate) {
    const [y, m, d] = current.split('-').map(Number)
    const jsDay = new Date(y, m - 1, d).getDay() // 0=Sun … 6=Sat
    for (const ev of recurring) {
      if (ev.day_of_week !== jsDay) continue
      const [sh, sm] = ev.start_time.split(':').map(Number)
      const [eh, em] = ev.end_time.split(':').map(Number)
      result.push({
        id: `recurring-${current}-${ev.day_of_week}-${ev.start_time}`,
        user_id: '',
        title: null,
        created_at: '',
        start_time: new Date(y, m - 1, d, sh, sm, 0).toISOString(),
        end_time:   new Date(y, m - 1, d, eh, em, 0).toISOString(),
      })
    }
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

  // How many of the initial active exams are there?
  // Used to scale up the daily cap when subjects rotate (each exam only gets 1/N of days).
  const initialActiveExamIds = new Set(
    [...remaining.keys()].map(matId => input.materials.find(m => m.id === matId)!.exam_id)
  )
  const totalInitialExams = initialActiveExamIds.size
  // rotationFactor < 1 when subjects rotate: each exam is studied on fewer days than total.
  const rotationFactor = input.maxSubjectsPerDay && totalInitialExams > 1
    ? Math.min(1, input.maxSubjectsPerDay / totalInitialExams)
    : 1

  // Pre-compute per-material daily cap so work spreads evenly across assigned study days.
  // When subjects rotate, each exam's effective study days shrink proportionally,
  // so the cap scales up (you study longer on the days you do show up).
  const dailyCap = new Map<string, number>()
  for (const [matId, rem] of remaining.entries()) {
    const material = input.materials.find(m => m.id === matId)!
    const exam     = input.exams.find(e => e.id === material.exam_id)!
    const lastStudyDate = addDays(exam.exam_date, -(exam.revision_days + 1))
    const studyDays = sortedDays.filter(d => d.date <= lastStudyDate).length
    const effectiveDays = Math.max(1, Math.ceil(studyDays * rotationFactor))
    dailyCap.set(matId, Math.ceil(rem / effectiveDays))
  }

  // Tracks the last date each exam was assigned — drives the round-robin rotation.
  const lastAssignedDate = new Map<string, string>() // examId → YYYY-MM-DD

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

    let scheduledExams: Exam[]
    if (input.maxSubjectsPerDay && input.maxSubjectsPerDay < activeExams.length) {
      // Score each exam: urgency × priority × how overdue it is for a session.
      // Exams never yet assigned get daysSinceLast=999 so they are always picked first.
      // After the first full rotation the score naturally cycles subjects in priority+urgency order.
      const [dy, dm, dd] = day.date.split('-').map(Number)
      const dayMs = Date.UTC(dy, dm - 1, dd)

      const scored = activeExams.map(exam => {
        const lastDate = lastAssignedDate.get(exam.id)
        let daysSinceLast = 999
        if (lastDate) {
          const [ly, lm, ld] = lastDate.split('-').map(Number)
          daysSinceLast = Math.round((dayMs - Date.UTC(ly, lm - 1, ld)) / 86_400_000)
        }

        const examMaterials = materialsByExam.get(exam.id) ?? []
        const remForExam = examMaterials.reduce((s, m) => s + (remaining.get(m.id) ?? 0), 0)

        const [ey, em, ed] = exam.exam_date.split('-').map(Number)
        const daysUntilExam = Math.max(1, Math.round((Date.UTC(ey, em - 1, ed) - dayMs) / 86_400_000))

        // urgency = units still needed per day until exam
        const urgency = remForExam / daysUntilExam
        // daysSinceLast^1.2 gives a gentle "overdue" boost without drowning out urgency
        const score = urgency * exam.priority * Math.pow(daysSinceLast, 1.2)
        return { exam, score }
      })

      scheduledExams = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, input.maxSubjectsPerDay)
        .map(s => s.exam)
    } else {
      scheduledExams = activeExams
    }

    // Update rotation tracker for the exams assigned today
    for (const exam of scheduledExams) {
      lastAssignedDate.set(exam.id, day.date)
    }

    const totalPriority = scheduledExams.reduce((n, e) => n + e.priority, 0)

    for (const exam of scheduledExams) {
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
        const cap        = dailyCap.get(material.id) ?? matRem
        const unitsTarget = Math.min(Math.floor(matShare * pace), cap, matRem)

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

// ─── Streak tracking ─────────────────────────────────────────────────────────

// Counts consecutive days where the user completed at least one scheduled session.
// Days with no schedule slots are skipped — they do NOT break the streak.
export function calculateStreak(
  schedules: Schedule[],
  sessions: StudySession[],
  today: string,
): number {
  // Study sessions are never deleted — use them as the source of truth.
  // Done schedule slots are also kept as a fallback for sessions recorded
  // via the dashboard "Done" button without a separate session row.
  const workedDates = new Set([
    ...sessions.map(s => s.session_date),
    ...schedules.filter(s => s.is_done).map(s => s.slot_date),
  ])

  // If nothing done today yet, start counting from yesterday so today's
  // pending slots don't penalise the user before the day is over.
  const start = workedDates.has(today) ? today : addDays(today, -1)

  let streak = 0
  let current = start

  for (let i = 0; i < 365; i++) {
    if (workedDates.has(current)) {
      streak++
    } else {
      break // any past day without recorded work breaks the streak
    }
    current = addDays(current, -1)
  }

  return streak
}

// ─── Crunch mode ─────────────────────────────────────────────────────────────

// Returns a warning for each material where the user's pace is too slow to finish
// all remaining units within the available time before the exam.
export function checkCrunchMode(input: SchedulerInput): CrunchWarning[] {
  const warnings: CrunchWarning[] = []
  const examById = new Map(input.exams.map(e => [e.id, e]))
  const today = todayStr()

  for (const material of input.materials) {
    const rem = calculateRemaining(material, input.sessions)
    if (rem === 0) continue

    const exam = examById.get(material.exam_id)
    if (!exam) continue
    if (exam.exam_date < today) continue

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

// ─── Study block placement ────────────────────────────────────────────────────

export interface StudyBlockPlacement {
  start_time: string // "HH:MM"
  end_time: string
}

const CAL_START = 6 * 60   // 06:00
const CAL_END   = 23 * 60  // 23:00

type Interval = [number, number]

function buildFreeGaps(params: {
  recurringEventsForDay: Array<{ start_time: string; end_time: string }>
  oneOffEventsForDay: Array<{ start_time: string; end_time: string }>
  nightEndMin: number
  nightStartMin: number
  bufferMin: number
}): Interval[] {
  const { recurringEventsForDay, oneOffEventsForDay, nightEndMin, nightStartMin, bufferMin } = params
  const blocked: Interval[] = []

  const wakeEnd = Math.min(CAL_END, nightEndMin + bufferMin)
  if (wakeEnd > CAL_START) blocked.push([CAL_START, wakeEnd])
  if (nightStartMin < CAL_END) blocked.push([nightStartMin, CAL_END])

  for (const ev of [...recurringEventsForDay, ...oneOffEventsForDay]) {
    blocked.push([
      Math.max(CAL_START, parseTimeMinutes(ev.start_time) - bufferMin),
      Math.min(CAL_END,   parseTimeMinutes(ev.end_time)   + bufferMin),
    ])
  }

  blocked.sort((a, b) => a[0] - b[0])
  const merged: Interval[] = []
  for (const [s, e] of blocked) {
    if (!merged.length || s > merged[merged.length - 1][1]) merged.push([s, e])
    else merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e)
  }

  const gaps: Interval[] = []
  let cur = CAL_START
  for (const [bs, be] of merged) {
    if (cur < bs) gaps.push([cur, bs])
    cur = Math.max(cur, be)
  }
  if (cur < CAL_END) gaps.push([cur, CAL_END])
  return gaps
}

// Returns the free time windows in a day as [startMin, endMin] pairs.
// Used by CalendarClient to place per-material study blocks.
export function getFreeWindows(params: {
  recurringEventsForDay: Array<{ start_time: string; end_time: string }>
  oneOffEventsForDay: Array<{ start_time: string; end_time: string }>
  nightEndMin: number
  nightStartMin: number
  bufferMin: number
}): [number, number][] {
  return buildFreeGaps(params)
}

// Distributes totalStudyMin minutes of study blocks across the free time in a day,
// respecting buffers around events and the wake-up/sleep window.
export function placeStudyBlocks(params: {
  recurringEventsForDay: Array<{ start_time: string; end_time: string }>
  oneOffEventsForDay: Array<{ start_time: string; end_time: string }>
  nightEndMin: number
  nightStartMin: number
  sessionLengthMin: number
  breakLengthMin: number
  bufferMin: number
  totalStudyMin: number
}): StudyBlockPlacement[] {
  const { sessionLengthMin, breakLengthMin, totalStudyMin } = params
  if (totalStudyMin <= 0) return []

  const gaps = buildFreeGaps(params)
  const totalFree = gaps.reduce((s, [a, b]) => s + b - a, 0)
  if (totalFree <= 0) return []

  const result: StudyBlockPlacement[] = []
  let remaining = Math.min(totalStudyMin, totalFree)

  for (const [gapStart, gapEnd] of gaps) {
    if (remaining <= 0) break
    let pos = gapStart
    while (remaining > 0 && pos < gapEnd) {
      const blockLen = Math.min(sessionLengthMin, remaining, gapEnd - pos)
      if (blockLen < 15) break
      result.push({ start_time: minsToHHMM(pos), end_time: minsToHHMM(pos + blockLen) })
      remaining -= blockLen
      pos       += blockLen + breakLengthMin
    }
  }

  return result
}

function minsToHHMM(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

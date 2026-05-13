'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import {
  getProfile, getExams, getAllMaterials, getSessionsByUser,
  getCalendarEvents, replaceSchedule, markScheduleDone, createSession,
  getBlockedDays,
} from '@/lib/supabase/helpers'
import {
  todayStr, addDays, computeAvailableDays, generateSchedule,
} from '@/lib/scheduler'
import type { ScheduleInsert } from '@/types'

type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>

export async function regenSchedule(supabase: SupabaseServerClient, userId: string) {
  const today = todayStr()

  const [profile, exams, materials, sessions, calendarEvents, blockedDays, todaySchedules] = await Promise.all([
    getProfile(supabase, userId),
    getExams(supabase, userId),
    getAllMaterials(supabase),
    getSessionsByUser(supabase, userId),
    getCalendarEvents(supabase, userId, today, addDays(today, 180)),
    getBlockedDays(supabase, userId, today, addDays(today, 180)),
    supabase.from('schedules').select('material_id, is_done').eq('user_id', userId).eq('slot_date', today),
  ])

  if (exams.length === 0 || materials.length === 0) return

  const maxExamDate       = exams.reduce((max, e) => e.exam_date > max ? e.exam_date : max, today)
  const nightStart        = profile?.night_start         ?? '23:00'
  const nightEnd          = profile?.night_end           ?? '07:00'
  const dailyStudyMinutes = profile?.daily_study_minutes ?? 120
  const maxSubjectsPerDay = profile?.max_subjects_per_day ?? null

  const doneMaterialIdsToday = new Set(
    (todaySchedules.data ?? []).filter(s => s.is_done).map(s => s.material_id)
  )

  const blockedSet   = new Set(blockedDays.map(b => b.blocked_date))
  const allAvailDays = computeAvailableDays(
    today, addDays(maxExamDate, 1), calendarEvents, nightStart, nightEnd
  )
    .filter(d => !blockedSet.has(d.date))
    .map(d => ({ ...d, availableMinutes: Math.min(d.availableMinutes, dailyStudyMinutes) }))

  const newSlots = generateSchedule({
    exams, materials, sessions, availableDays: allAvailDays, defaultPaceUnitsPerMin: 1, maxSubjectsPerDay,
  })

  const toInsert: ScheduleInsert[] = newSlots
    .filter(s => !(s.slot_date === today && doneMaterialIdsToday.has(s.material_id)))
    .map(s => ({
      user_id: userId,
      material_id: s.material_id,
      slot_date: s.slot_date,
      units_target: s.units_target,
      is_done: false,
    }))

  await replaceSchedule(supabase, userId, today, toInsert)
}

export async function updateProgressAction(scheduleId: string, unitsCompleted: number) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: slot } = await supabase
    .from('schedules')
    .select('material_id, units_target')
    .eq('id', scheduleId)
    .single()

  if (slot) {
    await createSession(supabase, {
      user_id: user.id,
      material_id: slot.material_id,
      units_completed: unitsCompleted,
      time_spent_sec: unitsCompleted * 60,
      session_date: todayStr(),
    })
  }

  await markScheduleDone(supabase, scheduleId)
  await regenSchedule(supabase, user.id)
  revalidatePath('/dashboard')
}

export async function lowEnergyDayAction() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayStr()

  const { data: slots } = await supabase
    .from('schedules')
    .select('id, units_target')
    .eq('user_id', user.id)
    .eq('slot_date', today)
    .eq('is_done', false)

  if (!slots || slots.length === 0) {
    revalidatePath('/dashboard')
    return
  }

  await Promise.all(
    slots.map(slot =>
      supabase
        .from('schedules')
        .update({ units_target: Math.max(1, Math.floor(slot.units_target / 2)) })
        .eq('id', slot.id)
    )
  )

  revalidatePath('/dashboard')
}

export async function regenerateScheduleAction() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayStr()

  // Only on explicit Re-plan: clear missed past slots so the slip-up banner resets
  await supabase
    .from('schedules')
    .delete()
    .eq('user_id', user.id)
    .eq('is_done', false)
    .lt('slot_date', today)

  await regenSchedule(supabase, user.id)
  revalidatePath('/dashboard')
}

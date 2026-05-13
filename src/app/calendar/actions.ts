'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import {
  createRecurringEvent,
  deleteRecurringEvent,
  createCalendarEvent,
  deleteCalendarEvent,
  createStudyBlocksBatch,
  deleteStudyBlocksForDate,
  blockDay,
  unblockDay,
} from '@/lib/supabase/helpers'
import type { StudyBlockInsert } from '@/types'
import { regenSchedule } from '@/app/dashboard/actions'

export async function addRecurringEventAction(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  await createRecurringEvent(supabase, {
    user_id:     user.id,
    title:       (formData.get('title') as string) || null,
    day_of_week: Number(formData.get('day_of_week')),
    start_time:  formData.get('start_time') as string,
    end_time:    formData.get('end_time') as string,
  })

  revalidatePath('/calendar')
  revalidatePath('/dashboard')
}

export async function removeRecurringEventAction(id: string) {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  await deleteRecurringEvent(supabase, id)
  revalidatePath('/calendar')
  revalidatePath('/dashboard')
}

export async function addCalendarEventAction(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const date       = formData.get('date') as string
  const startTime  = formData.get('start_time') as string
  const endTime    = formData.get('end_time') as string

  // Combine date + time into ISO strings (treat as local time)
  const start = new Date(`${date}T${startTime}:00`).toISOString()
  const end   = new Date(`${date}T${endTime}:00`).toISOString()

  await createCalendarEvent(supabase, {
    user_id:    user.id,
    title:      (formData.get('title') as string) || null,
    start_time: start,
    end_time:   end,
  })

  revalidatePath('/calendar')
  revalidatePath('/dashboard')
}

export async function removeCalendarEventAction(id: string) {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  await deleteCalendarEvent(supabase, id)
  revalidatePath('/calendar')
  revalidatePath('/dashboard')
}

export async function resetStudyBlocksForDateAction(date: string): Promise<void> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  await deleteStudyBlocksForDate(supabase, user.id, date)
}

export async function blockDayAction(date: string): Promise<void> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  await blockDay(supabase, user.id, date)
  await regenSchedule(supabase, user.id)
  revalidatePath('/calendar')
  revalidatePath('/dashboard')
}

export async function unblockDayAction(date: string): Promise<void> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  await unblockDay(supabase, user.id, date)
  await regenSchedule(supabase, user.id)
  revalidatePath('/calendar')
  revalidatePath('/dashboard')
}

export async function createStudyBlocksForDateAction(
  date: string,
  blocks: Array<{ start_time: string; end_time: string }>
): Promise<string[]> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const inserts: StudyBlockInsert[] = blocks.map(b => ({
    user_id: user.id,
    block_date: date,
    start_time: b.start_time,
    end_time: b.end_time,
  }))
  const created = await createStudyBlocksBatch(supabase, inserts)
  return created.map(b => b.id)
}

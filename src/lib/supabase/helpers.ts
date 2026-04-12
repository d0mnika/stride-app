// Typed query helpers. Each function accepts a Supabase client as the first argument
// so the same helper works with both the browser client and the server client.
// RLS policies on the database ensure users can only read/write their own rows.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type {
  Profile,
  ProfileInsert,
  Exam,
  ExamInsert,
  StudyMaterial,
  StudyMaterialInsert,
  StudySession,
  StudySessionInsert,
  CalendarEvent,
  CalendarEventInsert,
  Schedule,
  ScheduleInsert,
} from '@/types'

type Client = SupabaseClient<Database>

// ─── Profiles ────────────────────────────────────────────────────────────────

export async function getProfile(client: Client, userId: string): Promise<Profile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(error.message) // PGRST116 = no rows
  return data
}

export async function upsertProfile(client: Client, profile: ProfileInsert): Promise<Profile> {
  const { data, error } = await client
    .from('profiles')
    .upsert(profile)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// ─── Exams ───────────────────────────────────────────────────────────────────

export async function getExams(client: Client, userId: string): Promise<Exam[]> {
  const { data, error } = await client
    .from('exams')
    .select('*')
    .eq('user_id', userId)
    .order('exam_date', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export async function createExam(client: Client, exam: ExamInsert): Promise<Exam> {
  const { data, error } = await client
    .from('exams')
    .insert(exam)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateExam(
  client: Client,
  id: string,
  updates: Partial<ExamInsert>
): Promise<Exam> {
  const { data, error } = await client
    .from('exams')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteExam(client: Client, id: string): Promise<void> {
  const { error } = await client.from('exams').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── Study Materials ──────────────────────────────────────────────────────────

export async function getMaterialsByExam(
  client: Client,
  examId: string
): Promise<StudyMaterial[]> {
  const { data, error } = await client
    .from('study_materials')
    .select('*')
    .eq('exam_id', examId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

// Returns all materials owned by the user (RLS enforces ownership through exams).
export async function getAllMaterials(client: Client): Promise<StudyMaterial[]> {
  const { data, error } = await client
    .from('study_materials')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export async function createMaterial(
  client: Client,
  material: StudyMaterialInsert
): Promise<StudyMaterial> {
  const { data, error } = await client
    .from('study_materials')
    .insert(material)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateMaterial(
  client: Client,
  id: string,
  updates: Partial<StudyMaterialInsert>
): Promise<StudyMaterial> {
  const { data, error } = await client
    .from('study_materials')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteMaterial(client: Client, id: string): Promise<void> {
  const { error } = await client.from('study_materials').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── Study Sessions ───────────────────────────────────────────────────────────

export async function getSessionsByUser(
  client: Client,
  userId: string
): Promise<StudySession[]> {
  const { data, error } = await client
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function getSessionsByMaterial(
  client: Client,
  materialId: string
): Promise<StudySession[]> {
  const { data, error } = await client
    .from('study_sessions')
    .select('*')
    .eq('material_id', materialId)
    .order('session_date', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function createSession(
  client: Client,
  session: StudySessionInsert
): Promise<StudySession> {
  const { data, error } = await client
    .from('study_sessions')
    .insert(session)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// ─── Calendar Events ──────────────────────────────────────────────────────────

export async function getCalendarEvents(
  client: Client,
  userId: string,
  startDate: string, // ISO string (inclusive)
  endDate: string    // ISO string (inclusive)
): Promise<CalendarEvent[]> {
  const { data, error } = await client
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', startDate)
    .lte('end_time', endDate)
    .order('start_time', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export async function createCalendarEvent(
  client: Client,
  event: CalendarEventInsert
): Promise<CalendarEvent> {
  const { data, error } = await client
    .from('calendar_events')
    .insert(event)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteCalendarEvent(client: Client, id: string): Promise<void> {
  const { error } = await client.from('calendar_events').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── Schedules ────────────────────────────────────────────────────────────────

export async function getSchedules(
  client: Client,
  userId: string,
  startDate: string,
  endDate: string
): Promise<Schedule[]> {
  const { data, error } = await client
    .from('schedules')
    .select('*')
    .eq('user_id', userId)
    .gte('slot_date', startDate)
    .lte('slot_date', endDate)
    .order('slot_date', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

// Replaces the entire future schedule for a user. Deletes existing undone slots
// from today forward and inserts fresh ones. Call after generateSchedule().
export async function replaceSchedule(
  client: Client,
  userId: string,
  fromDate: string,
  slots: ScheduleInsert[]
): Promise<void> {
  const { error: deleteError } = await client
    .from('schedules')
    .delete()
    .eq('user_id', userId)
    .gte('slot_date', fromDate)
    .eq('is_done', false)
  if (deleteError) throw new Error(deleteError.message)

  if (slots.length === 0) return

  const { error: insertError } = await client.from('schedules').insert(slots)
  if (insertError) throw new Error(insertError.message)
}

export async function markScheduleDone(client: Client, scheduleId: string): Promise<void> {
  const { error } = await client
    .from('schedules')
    .update({ is_done: true })
    .eq('id', scheduleId)
  if (error) throw new Error(error.message)
}

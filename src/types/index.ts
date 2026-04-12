import type { Database } from './database'

type Tables = Database['public']['Tables']

export type Profile       = Tables['profiles']['Row']
export type Exam          = Tables['exams']['Row']
export type StudyMaterial = Tables['study_materials']['Row']
export type StudySession  = Tables['study_sessions']['Row']
export type CalendarEvent = Tables['calendar_events']['Row']
export type Schedule      = Tables['schedules']['Row']

export type ProfileInsert       = Tables['profiles']['Insert']
export type ExamInsert          = Tables['exams']['Insert']
export type StudyMaterialInsert = Tables['study_materials']['Insert']
export type StudySessionInsert  = Tables['study_sessions']['Insert']
export type CalendarEventInsert = Tables['calendar_events']['Insert']
export type ScheduleInsert      = Tables['schedules']['Insert']

export type { Database }

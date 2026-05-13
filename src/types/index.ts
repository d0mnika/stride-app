import type { Database } from './database'

type Tables = Database['public']['Tables']

export type Profile       = Tables['profiles']['Row']
export type Exam          = Tables['exams']['Row']
export type StudyMaterial = Tables['study_materials']['Row']
export type StudySession  = Tables['study_sessions']['Row']
export type CalendarEvent    = Tables['calendar_events']['Row']
export type RecurringEvent   = Tables['recurring_events']['Row']
export type MaterialSummary = Tables['material_summaries']['Row']
export type Schedule        = Tables['schedules']['Row']
export type StudyBlock      = Tables['study_blocks']['Row']
export type BlockedDay      = Tables['blocked_days']['Row']

export type ProfileInsert       = Tables['profiles']['Insert']
export type ExamInsert          = Tables['exams']['Insert']
export type StudyMaterialInsert = Tables['study_materials']['Insert']
export type StudySessionInsert  = Tables['study_sessions']['Insert']
export type CalendarEventInsert  = Tables['calendar_events']['Insert']
export type RecurringEventInsert = Tables['recurring_events']['Insert']
export type MaterialSummaryInsert = Tables['material_summaries']['Insert']
export type ScheduleInsert        = Tables['schedules']['Insert']
export type StudyBlockInsert      = Tables['study_blocks']['Insert']
export type BlockedDayInsert      = Tables['blocked_days']['Insert']

export type { Database }

// Auto-maintained: mirrors the Supabase schema in supabase/migrations/0001_initial_schema.sql
// Update this file whenever the schema changes.
//
// Structure matches what @supabase/supabase-js v2.103+ expects:
// each table needs Row/Insert/Update/Relationships, and the schema needs
// Views/Functions/Enums/CompositeTypes sections (empty for now).

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          night_start: string // Postgres time → "HH:MM:SS"
          night_end: string
          created_at: string
        }
        Insert: {
          id: string
          name?: string | null
          night_start?: string
          night_end?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          night_start?: string
          night_end?: string
          created_at?: string
        }
        Relationships: []
      }

      exams: {
        Row: {
          id: string
          user_id: string
          subject: string
          exam_date: string // Postgres date → "YYYY-MM-DD"
          priority: number
          revision_days: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject: string
          exam_date: string
          priority?: number
          revision_days?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject?: string
          exam_date?: string
          priority?: number
          revision_days?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'exams_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }

      study_materials: {
        Row: {
          id: string
          exam_id: string
          title: string
          type: 'book' | 'slides' | 'notes' | 'other' | null
          total_units: number
          unit_label: string
          created_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          title: string
          type?: 'book' | 'slides' | 'notes' | 'other' | null
          total_units: number
          unit_label?: string
          created_at?: string
        }
        Update: {
          id?: string
          exam_id?: string
          title?: string
          type?: 'book' | 'slides' | 'notes' | 'other' | null
          total_units?: number
          unit_label?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'study_materials_exam_id_fkey'
            columns: ['exam_id']
            referencedRelation: 'exams'
            referencedColumns: ['id']
          }
        ]
      }

      study_sessions: {
        Row: {
          id: string
          material_id: string
          user_id: string
          units_completed: number
          time_spent_sec: number
          session_date: string // "YYYY-MM-DD"
          created_at: string
        }
        Insert: {
          id?: string
          material_id: string
          user_id: string
          units_completed: number
          time_spent_sec: number
          session_date: string
          created_at?: string
        }
        Update: {
          id?: string
          material_id?: string
          user_id?: string
          units_completed?: number
          time_spent_sec?: number
          session_date?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'study_sessions_material_id_fkey'
            columns: ['material_id']
            referencedRelation: 'study_materials'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'study_sessions_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }

      calendar_events: {
        Row: {
          id: string
          user_id: string
          title: string | null
          start_time: string // ISO timestamptz
          end_time: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          start_time: string
          end_time: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          start_time?: string
          end_time?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'calendar_events_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }

      schedules: {
        Row: {
          id: string
          user_id: string
          material_id: string
          slot_date: string // "YYYY-MM-DD"
          units_target: number
          is_done: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          material_id: string
          slot_date: string
          units_target: number
          is_done?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          material_id?: string
          slot_date?: string
          units_target?: number
          is_done?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'schedules_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedules_material_id_fkey'
            columns: ['material_id']
            referencedRelation: 'study_materials'
            referencedColumns: ['id']
          }
        ]
      }
    }

    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

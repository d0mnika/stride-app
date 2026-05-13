import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/helpers'
import AppNav from '@/components/AppNav'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const profile = await getProfile(supabase, user.id)

  // Strip seconds from Postgres "HH:MM:SS" → "HH:MM" for <input type="time">
  const nightStart           = (profile?.night_start ?? '23:00').slice(0, 5)
  const nightEnd             = (profile?.night_end   ?? '07:00').slice(0, 5)
  const dailyStudyMinutes    = profile?.daily_study_minutes    ?? 120
  const breakLengthMinutes   = profile?.break_length_minutes   ?? 30
  const bufferMinutes        = profile?.buffer_minutes         ?? 60
  const maxSubjectsPerDay    = profile?.max_subjects_per_day   ?? null

  return (
    <main className="min-h-screen bg-[#F5F1EB]">
      <AppNav current="/settings" userInitial={user.email?.[0].toUpperCase()} />
      <div className="max-w-2xl mx-auto px-6 pt-10 pb-16">
        <h1 className="font-palatino text-3xl font-bold text-[#3D2B26] mb-8">Settings</h1>

        <SettingsClient
          nightStart={nightStart}
          nightEnd={nightEnd}
          dailyStudyMinutes={dailyStudyMinutes}
          breakLengthMinutes={breakLengthMinutes}
          bufferMinutes={bufferMinutes}
          maxSubjectsPerDay={maxSubjectsPerDay}
        />
      </div>
    </main>
  )
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { upsertProfile } from '@/lib/supabase/helpers'

export async function saveSettingsAction(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const nightStart           = (formData.get('night_start')            as string) || '23:00'
  const nightEnd             = (formData.get('night_end')              as string) || '07:00'
  const dailyStudyMinutes    = parseInt((formData.get('daily_study_minutes')    as string) || '120', 10)
  const breakLengthMinutes   = parseInt((formData.get('break_length_minutes')   as string) || '30',  10)
  const bufferMinutes        = parseInt((formData.get('buffer_minutes')         as string) || '60',  10)
  const maxSubjectsRaw       = formData.get('max_subjects_per_day') as string
  const maxSubjectsPerDay    = maxSubjectsRaw ? parseInt(maxSubjectsRaw, 10) : null

  await upsertProfile(supabase, {
    id: user.id,
    night_start: nightStart,
    night_end: nightEnd,
    daily_study_minutes:  Number.isFinite(dailyStudyMinutes)  && dailyStudyMinutes  > 0 ? dailyStudyMinutes  : 120,
    break_length_minutes: Number.isFinite(breakLengthMinutes) && breakLengthMinutes > 0 ? breakLengthMinutes : 30,
    buffer_minutes:       Number.isFinite(bufferMinutes)      && bufferMinutes      >= 0 ? bufferMinutes      : 60,
    max_subjects_per_day: maxSubjectsPerDay,
  })

  revalidatePath('/dashboard')
  revalidatePath('/settings')
}

'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteAccountAction() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Delete user data in dependency order
  await admin.from('schedules').delete().eq('user_id', user.id)
  await admin.from('study_sessions').delete().eq('user_id', user.id)
  await admin.from('calendar_events').delete().eq('user_id', user.id)

  // Delete study_materials via exams
  const { data: exams } = await admin.from('exams').select('id').eq('user_id', user.id)
  if (exams?.length) {
    const examIds = exams.map(e => e.id)
    await admin.from('study_materials').delete().in('exam_id', examIds)
  }

  await admin.from('exams').delete().eq('user_id', user.id)
  await admin.from('profiles').delete().eq('id', user.id)

  // Delete the auth user (requires service role)
  await admin.auth.admin.deleteUser(user.id)

  await supabase.auth.signOut()
  redirect('/login')
}

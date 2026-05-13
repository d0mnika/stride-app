'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { regenSchedule } from '@/app/dashboard/actions'

export async function regenAfterMaterialChange() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await regenSchedule(supabase, user.id)
  revalidatePath('/dashboard')
  revalidatePath('/materials')
}

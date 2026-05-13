import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getProfile, getAllMaterials, getExams } from '@/lib/supabase/helpers'
import AppNav from '@/components/AppNav'
import FocusClient from './FocusClient'

export default async function FocusPage() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const [profile, materials, exams] = await Promise.all([
    getProfile(supabase, user.id),
    getAllMaterials(supabase),
    getExams(supabase, user.id),
  ])

  return (
    <main className="min-h-screen bg-[#F5F1EB]">
      <AppNav current="/focus" userInitial={user.email?.[0].toUpperCase()} />
      <div className="flex flex-col items-center justify-center p-6 pt-12">
        <FocusClient
          materials={materials}
          exams={exams}
          plan={profile?.plan ?? 'free'}
        />
      </div>
    </main>
  )
}

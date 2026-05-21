import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getAllMaterials, getExams } from '@/lib/supabase/helpers'
import AppNav from '@/components/AppNav'
import BottomNav from '@/components/BottomNav'
import TimerClient from './TimerClient'

export default async function TimerPage() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const [materials, exams] = await Promise.all([
    getAllMaterials(supabase),
    getExams(supabase, user.id),
  ])

  return (
    <main className="min-h-screen bg-[#F5F1EB]">
      <AppNav current="/timer" userInitial={user.email?.[0].toUpperCase()} />
      <div className="flex flex-col items-center justify-center p-6 pt-12 pb-24 sm:pb-12">
        <TimerClient
          materials={materials}
          exams={exams}
          userId={user.id}
        />
      </div>
      <BottomNav current="/timer" />
    </main>
  )
}

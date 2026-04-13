import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getAllMaterials, getExams } from '@/lib/supabase/helpers'
import FocusClient from './FocusClient'

export default async function FocusPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const [materials, exams] = await Promise.all([
    getAllMaterials(supabase),
    getExams(supabase, session.user.id),
  ])

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <FocusClient
        materials={materials}
        exams={exams}
        userId={session.user.id}
      />
    </main>
  )
}

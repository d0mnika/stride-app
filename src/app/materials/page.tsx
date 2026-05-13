import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getProfile, getExams, getAllMaterials, getSessionsByUser } from '@/lib/supabase/helpers'
import AppNav from '@/components/AppNav'
import MaterialsClient from './MaterialsClient'

export default async function MaterialsPage() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const [profile, exams, materials, sessions] = await Promise.all([
    getProfile(supabase, user.id),
    getExams(supabase, user.id),
    getAllMaterials(supabase),
    getSessionsByUser(supabase, user.id),
  ])

  const plan = profile?.plan ?? 'free'

  return (
    <main className="min-h-screen bg-[#F5F1EB]">
      <AppNav current="/materials" userInitial={user.email?.[0].toUpperCase()} />
      <div className="max-w-3xl mx-auto px-6 pt-10 pb-16">
        <h1 className="font-palatino text-3xl font-bold text-[#3D2B26] mb-8">Exams &amp; Materials</h1>
        <MaterialsClient
          userId={user.id}
          plan={plan}
          initialExams={exams}
          initialMaterials={materials}
          initialSessions={sessions}
        />
      </div>
    </main>
  )
}

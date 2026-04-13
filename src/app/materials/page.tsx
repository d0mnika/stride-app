import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getExams, getAllMaterials, getSessionsByUser } from '@/lib/supabase/helpers'
import MaterialsClient from './MaterialsClient'

export default async function MaterialsPage() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const [exams, materials, sessions] = await Promise.all([
    getExams(supabase, user.id),
    getAllMaterials(supabase),
    getSessionsByUser(supabase, user.id),
  ])

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exams & Materials</h1>
            <p className="mt-1 text-sm text-gray-500">Add your exams and the material you need to study.</p>
          </div>
          <a href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition">
            ← Dashboard
          </a>
        </div>
        <MaterialsClient
          userId={user.id}
          initialExams={exams}
          initialMaterials={materials}
          initialSessions={sessions}
        />
      </div>
    </main>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Timer from '@/components/Timer'
import { getSupabaseClient } from '@/lib/supabase/client'
import { createSession } from '@/lib/supabase/helpers'
import type { StudyMaterial, Exam } from '@/types'
import type { SessionResult } from '@/components/Timer'

interface FocusClientProps {
  materials: StudyMaterial[]
  exams: Exam[]
  userId: string
}

const DURATIONS = [
  { label: '25 min', sec: 25 * 60 },
  { label: '45 min', sec: 45 * 60 },
  { label: '60 min', sec: 60 * 60 },
]

export default function FocusClient({ materials, exams, userId }: FocusClientProps) {
  const router = useRouter()
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('')
  const [durationSec, setDurationSec] = useState(25 * 60)
  const [sessionKey, setSessionKey] = useState(0) // increment to remount Timer

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId)

  // Group materials by exam for the selector
  const byExam = exams.map(exam => ({
    exam,
    materials: materials.filter(m => m.exam_id === exam.id),
  })).filter(g => g.materials.length > 0)

  async function handleSave(result: SessionResult) {
    const supabase = getSupabaseClient()
    await createSession(supabase, {
      material_id: result.materialId,
      user_id: userId,
      units_completed: result.unitsCompleted,
      time_spent_sec: result.timeSpentSec,
      session_date: result.sessionDate,
    })
    // Reset to selector after saving
    setSelectedMaterialId('')
    setSessionKey(k => k + 1)
    router.refresh()
  }

  // ─── No materials yet ───────────────────────────────────────────────────────
  if (materials.length === 0) {
    return (
      <div className="text-center">
        <p className="text-gray-500 text-sm">No study materials yet.</p>
        <a href="/materials" className="mt-3 inline-block text-sm font-medium text-gray-900 hover:underline">
          Add materials →
        </a>
      </div>
    )
  }

  // ─── Material + duration selector ──────────────────────────────────────────
  if (!selectedMaterial) {
    return (
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Focus</h1>
          <p className="mt-1 text-sm text-gray-500">Pick what you&apos;re studying today</p>
        </div>

        {/* Material picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
          <select
            value={selectedMaterialId}
            onChange={e => setSelectedMaterialId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
          >
            <option value="" disabled>Select a material…</option>
            {byExam.map(({ exam, materials: mats }) => (
              <optgroup key={exam.id} label={exam.subject}>
                {mats.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.unit_label}s)
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Duration picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Session length</label>
          <div className="flex gap-2">
            {DURATIONS.map(d => (
              <button
                key={d.sec}
                onClick={() => setDurationSec(d.sec)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                  durationSec === d.sec
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selection already committed — button is just a visual CTA; disabled until a material is chosen */}
        <p className="text-center text-sm text-gray-400">
          {selectedMaterialId ? 'Ready — the timer will start on the next screen.' : 'Select a material above to continue.'}
        </p>
      </div>
    )
  }

  // ─── Active timer ───────────────────────────────────────────────────────────
  return (
    <Timer
      key={sessionKey}
      material={selectedMaterial}
      durationSec={durationSec}
      onSave={handleSave}
      onCancel={() => setSelectedMaterialId('')}
    />
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Timer from '@/components/Timer'
import { getSupabaseClient } from '@/lib/supabase/client'
import { createSession } from '@/lib/supabase/helpers'
import { formatTime } from '@/lib/timer'
import type { StudyMaterial, Exam } from '@/types'
import type { SessionResult } from '@/components/Timer'

interface FocusClientProps {
  materials: StudyMaterial[]
  exams: Exam[]
  userId: string
}

interface PaceSummary {
  unitsCompleted: number
  timeSpentSec: number
  unitLabel: string
  materialTitle: string
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
  const [sessionKey, setSessionKey] = useState(0)
  const [summary, setSummary] = useState<PaceSummary | null>(null)

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId)

  const byExam = exams.map(exam => ({
    exam,
    materials: materials.filter(m => m.exam_id === exam.id),
  })).filter(g => g.materials.length > 0)

  async function handleSave(result: SessionResult) {
    const supabase = getSupabaseClient()
    const mat = materials.find(m => m.id === result.materialId)
    await createSession(supabase, {
      material_id: result.materialId,
      user_id: userId,
      units_completed: result.unitsCompleted,
      time_spent_sec: result.timeSpentSec,
      session_date: result.sessionDate,
    })
    setSummary({
      unitsCompleted: result.unitsCompleted,
      timeSpentSec: result.timeSpentSec,
      unitLabel: mat?.unit_label ?? 'unit',
      materialTitle: mat?.title ?? '',
    })
    setSelectedMaterialId('')
    setSessionKey(k => k + 1)
    router.refresh()
  }

  function handleStartAnother() {
    setSummary(null)
  }

  // ─── Pace summary screen ────────────────────────────────────────────────────
  if (summary) {
    const minutes = summary.timeSpentSec / 60
    const pace = minutes > 0 ? summary.unitsCompleted / minutes : 0

    return (
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <div>
          <p className="text-4xl font-bold text-gray-900">
            {pace > 0 ? pace.toFixed(1) : '—'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {summary.unitLabel}s per minute
          </p>
        </div>

        <div className="w-full rounded-xl border border-gray-100 bg-white divide-y divide-gray-100 text-sm">
          <div className="flex justify-between px-4 py-3">
            <span className="text-gray-500">Material</span>
            <span className="font-medium text-gray-900 text-right max-w-[55%] truncate">
              {summary.materialTitle}
            </span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="text-gray-500">{summary.unitLabel}s completed</span>
            <span className="font-medium text-gray-900">{summary.unitsCompleted}</span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="text-gray-500">Time spent</span>
            <span className="font-medium text-gray-900">{formatTime(summary.timeSpentSec)}</span>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Stride uses this pace to build your study plan.
        </p>

        <button onClick={handleStartAnother} className={btnPrimary}>
          Start another session
        </button>
      </div>
    )
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

const btnPrimary = 'rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 transition'

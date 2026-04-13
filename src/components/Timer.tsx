'use client'

import { useState } from 'react'
import { useTimer } from '@/hooks/useTimer'
import type { StudyMaterial } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionResult {
  materialId: string
  unitsCompleted: number
  timeSpentSec: number
  sessionDate: string // YYYY-MM-DD
}

interface TimerProps {
  material: StudyMaterial
  durationSec?: number              // default 25 min
  onSave: (result: SessionResult) => Promise<void>
  onCancel: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Timer({ material, durationSec = 25 * 60, onSave, onCancel }: TimerProps) {
  const [unitsInput, setUnitsInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { state, formattedRemaining, formattedElapsed, start, pause, resume, finish } = useTimer({
    durationSec,
    onComplete() {
      // Natural completion: show the units form automatically.
      // No action needed here — the status change re-renders the UI.
    },
  })

  const isIdle      = state.status === 'idle'
  const isRunning   = state.status === 'running'
  const isPaused    = state.status === 'paused'
  const isCompleted = state.status === 'completed'
  const isActive    = isRunning || isPaused

  // Progress 0→1 for the ring
  const progress = state.elapsedSec / state.durationSec

  async function handleSave() {
    const units = parseInt(unitsInput, 10)
    if (isNaN(units) || units < 0) return

    setSaving(true)
    setSaveError(null)
    try {
      await onSave({
        materialId: material.id,
        unitsCompleted: units,
        timeSpentSec: state.elapsedSec,
        sessionDate: new Date().toISOString().slice(0, 10),
      })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save session')
      setSaving(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-6 select-none">
      {/* Material label */}
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400">Studying</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">{material.title}</p>
      </div>

      {/* Ring + time display */}
      <div className="relative w-52 h-52">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Track */}
          <circle cx="50" cy="50" r="44" fill="none" stroke="#e5e7eb" strokeWidth="6" />
          {/* Progress */}
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke={isCompleted ? '#16a34a' : '#111827'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress)}`}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-mono font-bold text-gray-900 tabular-nums">
            {formattedRemaining}
          </span>
          {isActive && (
            <span className="text-xs text-gray-400 mt-1">{formattedElapsed} elapsed</span>
          )}
        </div>
      </div>

      {/* Controls */}
      {!isCompleted && (
        <div className="flex gap-3">
          {isIdle && (
            <button onClick={start} className={btnPrimary}>
              Start
            </button>
          )}
          {isRunning && (
            <>
              <button onClick={pause} className={btnSecondary}>Pause</button>
              <button onClick={finish} className={btnPrimary}>Finish early</button>
            </>
          )}
          {isPaused && (
            <>
              <button onClick={resume} className={btnPrimary}>Resume</button>
              <button onClick={finish} className={btnSecondary}>Finish early</button>
            </>
          )}
          {(isIdle || isActive) && (
            <button onClick={onCancel} className={btnGhost}>Cancel</button>
          )}
        </div>
      )}

      {/* Units form — shown after session ends */}
      {isCompleted && (
        <div className="w-full max-w-xs flex flex-col gap-3">
          <p className="text-center text-sm font-medium text-gray-700">
            Session complete! How many {material.unit_label}s did you cover?
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              placeholder={`${material.unit_label}s completed`}
              value={unitsInput}
              onChange={e => setUnitsInput(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={saving || unitsInput === ''}
              className={btnPrimary + ' shrink-0'}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {saveError && (
            <p className="text-xs text-red-600 text-center">{saveError}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Style helpers ─────────────────────────────────────────────────────────────

const btnPrimary   = 'rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition'
const btnSecondary = 'rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition'
const btnGhost     = 'px-5 py-2 text-sm text-gray-400 hover:text-gray-600 transition'

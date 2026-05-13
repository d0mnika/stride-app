'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
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
  durationSec?: number
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
    onComplete() {},
  })

  const isIdle      = state.status === 'idle'
  const isRunning   = state.status === 'running'
  const isPaused    = state.status === 'paused'
  const isCompleted = state.status === 'completed'
  const isActive    = isRunning || isPaused

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

  return (
    <div className="flex flex-col items-center gap-6 select-none">

      {/* Material label */}
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-[#A38F86]">Studying</p>
        <p className="mt-1 text-lg font-semibold text-[#3D2B26]">{material.title}</p>
      </div>

      {/* Ring + time display */}
      <div className="relative w-52 h-52">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#EDEAE3" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke={isCompleted ? '#7BA87B' : '#C8A7A1'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress)}`}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-mono font-bold text-[#3D2B26] tabular-nums">
            {formattedRemaining}
          </span>
          {isActive && (
            <span className="text-xs text-[#A38F86] mt-1">{formattedElapsed} elapsed</span>
          )}
        </div>
      </div>

      {/* Controls */}
      {!isCompleted && (
        <div className="flex gap-3">
          {isIdle && (
            <button onClick={start} className={btnPrimary}>Start</button>
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

      {/* Post-session modal */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-[#FAF9F7] rounded-2xl shadow-[0_20px_60px_rgba(163,143,134,0.25)] p-6 flex flex-col gap-5">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#F0EDE8] rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={24} className="text-[#7BA87B]" />
              </div>
              <h2 className="text-lg font-semibold text-[#3D2B26]">Session complete!</h2>
              <p className="text-sm text-[#8C7B75] mt-1">
                How many {material.unit_label}s did you cover?
              </p>
            </div>

            <input
              type="number"
              min={0}
              placeholder="e.g. 12"
              value={unitsInput}
              onChange={e => setUnitsInput(e.target.value)}
              className="w-full rounded-lg border border-[#EDEAE3] bg-[#FAF9F7] px-3 py-2.5 text-center text-lg font-medium text-[#3D2B26] outline-none focus:border-[#C8A7A1] focus:ring-1 focus:ring-[#C8A7A1]"
              autoFocus
            />

            {saveError && <p className="text-xs text-red-600 text-center">{saveError}</p>}

            <button
              onClick={handleSave}
              disabled={saving || unitsInput === ''}
              className="w-full rounded-lg bg-[#C8A7A1] py-2.5 text-sm font-medium text-white hover:bg-[#B89390] disabled:opacity-50 transition shadow-[0_4px_12px_rgba(200,167,161,0.3)]"
            >
              {saving ? 'Saving…' : 'Save & see pace'}
            </button>

            <p className="text-center text-xs text-[#A38F86]">
              Time studied: {formattedElapsed}
            </p>
          </div>
        </div>
      )}

    </div>
  )
}

const btnPrimary   = 'rounded-lg bg-[#C8A7A1] px-5 py-2 text-sm font-medium text-white hover:bg-[#B89390] disabled:opacity-50 transition shadow-[0_4px_12px_rgba(200,167,161,0.25)]'
const btnSecondary = 'rounded-lg border border-[#D2C4B5] px-5 py-2 text-sm font-medium text-[#5C4A45] hover:bg-[#F0ECE6] transition'
const btnGhost     = 'px-5 py-2 text-sm text-[#A38F86] hover:text-[#5C4A45] transition'

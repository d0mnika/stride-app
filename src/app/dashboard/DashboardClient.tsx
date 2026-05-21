'use client'

import { useTransition, useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, BookOpen, Flame, Lock, BatteryLow, PartyPopper } from 'lucide-react'
import confetti from 'canvas-confetti'
import { updateProgressAction, regenerateScheduleAction, lowEnergyDayAction } from './actions'
import { calculateRemaining } from '@/lib/scheduler'
import type { Schedule, Exam, StudyMaterial, StudySession } from '@/types'

interface CrunchWarning {
  material_id: string
  exam_subject: string
  remaining_units: number
  available_minutes: number
  pace_units_per_min: number
  pace_needed_units_per_min: number | null
}

interface Props {
  todaySlots: Schedule[]
  slipUps: Schedule[]
  exams: Exam[]
  materials: StudyMaterial[]
  sessions: StudySession[]
  streak: number
  crunchWarnings: CrunchWarning[]
  plan: string
  dailyStudyMinutes: number
}

export default function DashboardClient({
  todaySlots, slipUps, exams, materials, sessions, streak, crunchWarnings, plan, dailyStudyMinutes,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [progressInputs, setProgressInputs] = useState<Record<string, string>>({})
  const [showLowEnergyConfirm, setShowLowEnergyConfirm] = useState(false)
  const [celebratingExam, setCelebratingExam] = useState<Exam | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  const materialById = new Map(materials.map(m => [m.id, m]))
  const examById     = new Map(exams.map(e => [e.id, e]))
  const isPro        = plan === 'pro'

  // Check for newly completed exams and trigger celebration
  useEffect(() => {
    const celebrated: string[] = JSON.parse(localStorage.getItem('celebratedExams') ?? '[]')

    for (const exam of exams) {
      if (celebrated.includes(exam.id)) continue
      const examMaterials = materials.filter(m => m.exam_id === exam.id)
      if (examMaterials.length === 0) continue
      const allDone = examMaterials.every(m => calculateRemaining(m, sessions) <= 0)
      if (allDone) {
        setCelebratingExam(exam)
        localStorage.setItem('celebratedExams', JSON.stringify([...celebrated, exam.id]))
        break
      }
    }
  }, [exams, materials, sessions])

  // Fire confetti when overlay appears
  useEffect(() => {
    if (!celebratingExam) return
    const fire = (origin: { x: number; y: number }) =>
      confetti({
        particleCount: 80,
        spread: 70,
        origin,
        colors: ['#C8A7A1', '#7BA87B', '#3D2B26', '#E8C9C5', '#F5F1EB', '#A8C4A8'],
      })
    setTimeout(() => {
      fire({ x: 0.2, y: 0.6 })
      fire({ x: 0.8, y: 0.6 })
    }, 200)
    setTimeout(() => {
      fire({ x: 0.5, y: 0.5 })
    }, 600)
  }, [celebratingExam])

  function handleUpdateProgress(scheduleId: string, unitsTarget: number) {
    const raw   = progressInputs[scheduleId] ?? String(unitsTarget)
    const units = parseInt(raw, 10)
    if (isNaN(units) || units < 0) return
    startTransition(() => { updateProgressAction(scheduleId, units) })
  }

  function handleReplan() {
    startTransition(() => { regenerateScheduleAction() })
  }

  function handleLowEnergy() {
    startTransition(() => { lowEnergyDayAction() })
  }

  // ─── Empty state ─────────────────────────────────────────────────────────────
  if (exams.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen size={32} className="mx-auto text-[#C4B3AC] mb-3" />
        <p className="text-[#8C7B75] text-sm">No exams added yet.</p>
        <a href="/materials" className="mt-3 inline-block text-sm font-medium text-[#C8A7A1] hover:text-[#B89390] transition">
          Add your first exam →
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Celebration overlay */}
      {celebratingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F5F1EB]/95 backdrop-blur-sm px-6">
          <div className="text-center max-w-sm">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-[#F0ECE6] border border-[#D2C4B5] flex items-center justify-center shadow-[0_4px_20px_rgba(163,143,134,0.2)]">
                <PartyPopper size={36} className="text-[#C8A7A1]" />
              </div>
            </div>
            <h2 className="font-palatino text-4xl font-bold text-[#3D2B26] mb-3">
              You did it!
            </h2>
            <p className="text-lg text-[#5C4A45] mb-2">
              All materials for
            </p>
            <p className="font-palatino text-2xl font-bold text-[#C8A7A1] mb-6">
              {celebratingExam.subject}
            </p>
            <p className="text-sm text-[#8C7B75] mb-10 leading-relaxed">
              You finished everything on time. Take a moment to be proud — then go ace that exam.
            </p>
            <button
              onClick={() => setCelebratingExam(null)}
              className="w-full py-3.5 rounded-xl bg-[#3D2B26] text-[#F5F1EB] text-sm font-semibold hover:bg-[#5C4A45] transition shadow-[0_4px_12px_rgba(61,43,38,0.2)]"
            >
              Let&apos;s go!
            </button>
          </div>
        </div>
      )}

      {/* Streak */}
      {streak > 0 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-sm font-medium text-[#C8A7A1] bg-[#F6E5E7] border border-[#EBD5D0] rounded-full px-5 py-2.5 shadow-[0_2px_8px_rgba(200,167,161,0.2)]">
            <Flame size={15} />
            {streak} day streak — keep it up!
          </div>
        </div>
      )}

      {/* Slip-up alert */}
      {slipUps.length > 0 && (
        <div className="rounded-xl border border-[#D6A49A] bg-[#FDF4F0] px-5 py-4 flex items-start justify-between gap-4 shadow-[0_2px_8px_rgba(214,164,154,0.15)]">
          <div>
            <p className="text-sm font-semibold text-[#7A4A42]">
              You missed {slipUps.length} session{slipUps.length !== 1 ? 's' : ''}
            </p>
            <p className="mt-0.5 text-xs text-[#9A6A62]">
              Regenerate your plan to redistribute the missed work across remaining days.
            </p>
          </div>
          <button
            onClick={handleReplan}
            disabled={isPending}
            className="shrink-0 rounded-lg bg-[#D6A49A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#C8877E] disabled:opacity-50 transition shadow-[0_2px_6px_rgba(214,164,154,0.4)]"
          >
            {isPending ? 'Updating…' : 'Re-plan'}
          </button>
        </div>
      )}

      {/* Crunch warnings — Pro only */}
      {isPro ? (
        crunchWarnings.map(w => {
          const mat = materialById.get(w.material_id)
          const needed = w.pace_needed_units_per_min === null
            ? '∞'
            : w.pace_needed_units_per_min.toFixed(1)

          const extraMinPerDay = w.pace_needed_units_per_min !== null && w.pace_units_per_min > 0
            ? Math.ceil((w.pace_needed_units_per_min / w.pace_units_per_min - 1) * dailyStudyMinutes)
            : null
          const suggestedTotal = extraMinPerDay !== null
            ? dailyStudyMinutes + extraMinPerDay
            : null

          return (
            <div key={w.material_id} className="rounded-xl border border-[#E69B97] bg-[#FAF0EF] px-5 py-4 flex items-start gap-3 shadow-[0_2px_8px_rgba(230,155,151,0.12)]">
              <AlertTriangle size={15} className="shrink-0 text-[#C47070] mt-0.5" />
              <div className="flex flex-col gap-2 min-w-0">
                <div>
                  <p className="text-sm font-semibold text-[#7A3535]">
                    At your current pace you won&apos;t finish &ldquo;{mat?.title ?? 'this material'}&rdquo; in time
                  </p>
                  <p className="mt-0.5 text-xs text-[#9A5555]">
                    {w.exam_subject} · needs {needed} {mat?.unit_label ?? 'unit'}s/min, you average {w.pace_units_per_min.toFixed(1)}/min
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 pt-1 border-t border-[#E69B97]/40">
                  {suggestedTotal !== null && (
                    <p className="text-xs text-[#9A5555]">
                      <span className="font-medium">Study at least {suggestedTotal} min/day</span>
                      {' '}(+{extraMinPerDay} min more than your current goal) —{' '}
                      <a href="/settings" className="underline hover:text-[#7A3535]">
                        update in Settings
                      </a>
                    </p>
                  )}
                  <p className="text-xs text-[#9A5555]">
                    AI summaries can help you cover material faster —{' '}
                    <a href="/materials" className="underline hover:text-[#7A3535]">
                      generate one for this material
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )
        })
      ) : (
        <div className="rounded-xl border border-[#EDEAE3] bg-[#FAF9F7] px-5 py-4 flex items-center gap-3 shadow-[0_2px_8px_rgba(163,143,134,0.08)]">
          <Lock size={14} className="shrink-0 text-[#C4B3AC]" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[#A38F86]">Crunch Mode Warning</p>
            <p className="text-xs text-[#C4B3AC]">Know when you&apos;re falling behind — Pro feature</p>
          </div>
          <a href="/settings" className="shrink-0 text-xs font-medium text-[#8C7B75] hover:text-[#3D2B26] transition">
            Upgrade →
          </a>
        </div>
      )}

      {/* Today's plan */}
      <div>
        <h2 className="font-palatino text-3xl font-bold text-[#3D2B26] text-center mb-4">
          Today&apos;s plan
        </h2>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            onClick={handleReplan}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg border border-[#D2C4B5] bg-[#F0ECE6] px-4 py-2 text-xs font-medium text-[#5C4A45] hover:bg-[#E8DDD5] hover:border-[#A38F86] disabled:opacity-50 transition shadow-[0_2px_6px_rgba(163,143,134,0.12)]"
          >
            {isPending ? 'Updating…' : 'Regenerate'}
          </button>

          {isPro ? (
            showLowEnergyConfirm ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#9A6A62] font-medium">Halves today&apos;s targets — confirm?</span>
                <button
                  onClick={() => { handleLowEnergy(); setShowLowEnergyConfirm(false) }}
                  disabled={isPending}
                  className="rounded-lg bg-[#D6A49A] px-3 py-2 font-medium text-white hover:bg-[#C8877E] disabled:opacity-50 transition shadow-[0_2px_6px_rgba(214,164,154,0.3)]"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowLowEnergyConfirm(false)}
                  className="text-[#A38F86] hover:text-[#5C4A45] transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLowEnergyConfirm(true)}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg border border-[#D2C4B5] bg-[#F0ECE6] px-4 py-2 text-xs font-medium text-[#5C4A45] hover:bg-[#E8DDD5] hover:border-[#A38F86] disabled:opacity-50 transition shadow-[0_2px_6px_rgba(163,143,134,0.12)]"
              >
                <BatteryLow size={12} />
                Low energy day
              </button>
            )
          ) : (
            <span
              className="flex items-center gap-1.5 rounded-lg border border-[#EDEAE3] bg-[#FAF9F7] px-4 py-2 text-xs font-medium text-[#C4B3AC] cursor-default select-none"
              title="Low Energy Day — Pro feature"
            >
              <Lock size={11} />
              Low energy day
            </span>
          )}
        </div>

        {todaySlots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D2C4B5] px-5 py-8 text-center">
            <p className="text-sm text-[#A38F86]">Nothing scheduled for today.</p>
            <a href="/focus" className="mt-2 inline-block text-xs text-[#8C7B75] hover:text-[#5C4A45] transition">
              Start a free session →
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {todaySlots.map(slot => {
              const material     = materialById.get(slot.material_id)
              const exam         = material ? examById.get(material.exam_id) : undefined
              const actualUnits  = sessions
                .filter(s => s.material_id === slot.material_id && s.session_date === slot.slot_date)
                .reduce((sum, s) => sum + s.units_completed, 0)
              return (
                <div
                  key={slot.id}
                  className={`rounded-xl border px-5 py-4 flex items-center justify-between gap-4 transition shadow-[0_2px_8px_rgba(163,143,134,0.08)] ${
                    slot.is_done
                      ? 'border-[#B5C4AA] bg-[#F0EDE8]'
                      : 'border-[#EDEAE3] bg-[#FAF9F7]'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${slot.is_done ? 'text-[#4D6A49] line-through' : 'text-[#3D2B26]'}`}>
                      {material?.title ?? 'Unknown material'}
                    </p>
                    <p className="text-xs text-[#A38F86] mt-0.5">
                      {exam?.subject ?? ''}{exam ? ' · ' : ''}
                      {slot.is_done ? `${actualUnits || slot.units_target} ${material?.unit_label ?? 'unit'}s` : `${slot.units_target} ${material?.unit_label ?? 'unit'}s planned`}
                    </p>
                  </div>
                  {slot.is_done ? (
                    <CheckCircle size={18} className="shrink-0 text-[#7BA87B]" />
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min={0}
                        value={progressInputs[slot.id] ?? slot.units_target}
                        onChange={e => setProgressInputs(prev => ({ ...prev, [slot.id]: e.target.value }))}
                        className="w-14 rounded-lg border border-[#EDEAE3] bg-[#FAF9F7] px-2 py-1.5 text-sm text-center text-[#3D2B26] outline-none focus:border-[#C8A7A1] focus:ring-1 focus:ring-[#C8A7A1]"
                      />
                      <span className="text-xs text-[#A38F86] whitespace-nowrap">{material?.unit_label ?? 'unit'}s</span>
                      <button
                        onClick={() => handleUpdateProgress(slot.id, slot.units_target)}
                        disabled={isPending}
                        className="rounded-lg bg-[#C8A7A1] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#B89390] disabled:opacity-50 transition shadow-[0_2px_6px_rgba(200,167,161,0.3)]"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Progress per exam */}
      <div>
        <h2 className="font-palatino text-3xl font-bold text-[#3D2B26] text-center mb-5">Progress</h2>
        <div className="flex flex-col gap-5">
          {(() => {
            const activeExams: React.ReactNode[] = []
            const completedExams: React.ReactNode[] = []

            exams.forEach(exam => {
              const examMaterials = materials.filter(m => m.exam_id === exam.id)
              if (examMaterials.length === 0) return

              const daysUntil = Math.ceil(
                (new Date(exam.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )

              const isCompleted = examMaterials.every(m => calculateRemaining(m, sessions) <= 0)

              const card = (
                <div key={exam.id} className={`rounded-xl border px-5 py-4 shadow-[0_2px_8px_rgba(163,143,134,0.1)] ${isCompleted ? 'border-[#B5C4AA] bg-[#F0EDE8]' : 'border-[#EDEAE3] bg-[#FAF9F7]'}`}>
                  <div className="flex items-baseline justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isCompleted && <CheckCircle size={13} className="text-[#7BA87B] shrink-0" />}
                      <p className={`text-sm font-semibold ${isCompleted ? 'text-[#4D6A49]' : 'text-[#3D2B26]'}`}>{exam.subject}</p>
                    </div>
                    <p className="text-xs text-[#A38F86]">
                      {isCompleted ? 'Done' : daysUntil > 0 ? `${daysUntil}d left` : daysUntil === 0 ? 'Today!' : 'Past'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {examMaterials.map(m => {
                      const remaining = calculateRemaining(m, sessions)
                      const completed = m.total_units - remaining
                      const pct       = m.total_units > 0 ? (completed / m.total_units) * 100 : 0
                      return (
                        <div key={m.id}>
                          <div className="flex items-baseline justify-between mb-1">
                            <p className="text-xs text-[#6E5850] truncate max-w-[60%]">{m.title}</p>
                            <p className="text-xs text-[#A38F86]">{completed}/{m.total_units} {m.unit_label}s</p>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[#EDEAE3] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-[#7BA87B]' : 'bg-[#C8A7A1]'}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )

              if (isCompleted) completedExams.push(card)
              else activeExams.push(card)
            })

            return (
              <>
                {activeExams}
                {completedExams.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowCompleted(v => !v)}
                      className="w-full flex items-center justify-center gap-2 text-xs text-[#A38F86] hover:text-[#5C4A45] transition py-2"
                    >
                      <CheckCircle size={13} className="text-[#7BA87B]" />
                      {showCompleted ? 'Hide' : 'Show'} completed ({completedExams.length})
                    </button>
                    {showCompleted && (
                      <div className="flex flex-col gap-5 mt-3">
                        {completedExams}
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          })()}
        </div>
      </div>

    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { Lock, Volume2, VolumeX, Pause, Play, CheckCircle, X } from 'lucide-react'
import { useTimer } from '@/hooks/useTimer'
import type { StudyMaterial, Exam } from '@/types'

type Sound = 'none' | 'brown' | 'white'

const QUOTES = [
  'The secret of getting ahead is getting started.',
  'You don\'t have to be great to start, but you have to start to be great.',
  'Focus on being productive instead of busy.',
  'It always seems impossible until it\'s done.',
  'Your future self is counting on you.',
  'Progress, not perfection.',
  'One page at a time.',
  'Small consistent steps beat occasional sprints.',
  'Discipline is choosing between what you want now and what you want most.',
  'Done is better than perfect.',
]

const DONE_QUOTES = [
  'Another session in the books.',
  'That\'s how it\'s done.',
  'You showed up. That\'s everything.',
  'One step closer.',
  'Future you is grateful.',
  'Consistency compounds.',
  'Rest. You\'ve earned it.',
]

const KEEP_GOING_QUOTES = [
  'You\'ve got more in you.',
  'Five more minutes. You can do five.',
  'The hardest part is staying. You\'re still here.',
  'Don\'t stop now — the momentum is yours.',
  'Push through the resistance.',
  'The session isn\'t over yet.',
  'Every extra minute compounds.',
]

const DURATIONS = [
  { label: '25 min', sec: 25 * 60 },
  { label: '45 min', sec: 45 * 60 },
  { label: '60 min', sec: 60 * 60 },
]

const SOUNDS: { id: Sound; label: string }[] = [
  { id: 'none',  label: 'None' },
  { id: 'brown', label: 'Brown noise' },
  { id: 'white', label: 'White noise' },
]

// ─── FocusSession ─────────────────────────────────────────────────────────────

interface FocusSessionProps {
  material: StudyMaterial
  durationSec: number
  sound: Sound
  onDone: () => void
  onCancel: () => void
}

function FocusSession({ material, durationSec, sound, onDone, onCancel }: FocusSessionProps) {
  const [muted, setMuted] = useState(false)
  const [earlyPrompt, setEarlyPrompt] = useState(false)
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])
  const [doneQuote] = useState(() => DONE_QUOTES[Math.floor(Math.random() * DONE_QUOTES.length)])
  const [keepGoingQuote] = useState(() => KEEP_GOING_QUOTES[Math.floor(Math.random() * KEEP_GOING_QUOTES.length)])

  const gainRef = useRef<GainNode | null>(null)

  // Dark-brown status bar while in focus session
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    const prev = meta?.getAttribute('content') ?? '#F5F1EB'
    meta?.setAttribute('content', '#1A0E0A')
    return () => { meta?.setAttribute('content', prev) }
  }, [])

  const { state, formattedRemaining, formattedElapsed, start, pause, resume, finish } = useTimer({
    durationSec,
    onComplete() {},
  })

  // Ambient sound via Web Audio API
  useEffect(() => {
    if (sound === 'none') return

    const ctx = new AudioContext()
    const bufferSize = ctx.sampleRate * 4
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    if (sound === 'brown') {
      let last = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        last = (last + 0.02 * white) / 1.02
        data[i] = last * 3.5
      }
    } else {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const gain = ctx.createGain()
    gain.gain.value = 0.25
    gainRef.current = gain

    source.connect(gain)
    gain.connect(ctx.destination)
    source.start()

    return () => {
      source.stop()
      ctx.close()
    }
  }, [sound])

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = muted ? 0 : 0.25
  }, [muted])

  const isIdle      = state.status === 'idle'
  const isRunning   = state.status === 'running'
  const isPaused    = state.status === 'paused'
  const isCompleted = state.status === 'completed'
  const isActive    = isRunning || isPaused
  const progress    = state.durationSec > 0 ? state.elapsedSec / state.durationSec : 0

  return (
    <div className="fixed inset-0 z-50 bg-[#1A0E0A] flex flex-col items-center justify-center select-none">

      {/* Top bar */}
      <div
        className="absolute left-0 right-0 flex items-center justify-between px-6"
        style={{ top: 'calc(1.5rem + env(safe-area-inset-top))' }}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-600">Studying</p>
          <p className="text-sm font-semibold text-gray-200 mt-0.5 max-w-[200px] truncate">{material.title}</p>
        </div>
        <div className="flex items-center gap-3">
          {sound !== 'none' && (
            <button
              onClick={() => setMuted(m => !m)}
              className="text-gray-600 hover:text-gray-300 transition"
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          )}
          <button
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-300 transition"
            title="Exit focus"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Quote */}
      <p
        className="absolute text-xs text-[#6B4D44] text-center max-w-xs px-6 italic leading-relaxed"
        style={{ top: 'calc(6rem + env(safe-area-inset-top))' }}
      >
        &ldquo;{quote}&rdquo;
      </p>

      {/* Early-quit prompt */}
      {earlyPrompt && (
        <div className="flex flex-col items-center gap-6 text-center px-6">
          <p className="text-sm text-gray-500 italic">&ldquo;{keepGoingQuote}&rdquo;</p>
          <button
            onClick={() => { setEarlyPrompt(false); resume() }}
            className={btnFocusPrimary}
          >
            <Play size={14} /> Keep going
          </button>
          <button
            onClick={onCancel}
            className="text-xs text-gray-600 hover:text-gray-400 transition"
          >
            Quit session
          </button>
        </div>
      )}

      {/* Timer ring */}
      {!earlyPrompt && !isCompleted && (
        <div className="relative w-64 h-64">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#3D2B26" strokeWidth="4" />
            <circle
              cx="50" cy="50" r="44"
              fill="none"
              stroke="#C8A7A1"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress)}`}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-mono font-bold text-white tabular-nums">
              {formattedRemaining}
            </span>
            {isActive && (
              <span className="text-xs text-gray-600 mt-2">{formattedElapsed} elapsed</span>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      {!earlyPrompt && !isCompleted && (
        <div className="mt-10 flex gap-3">
          {isIdle && (
            <button onClick={start} className={btnFocusPrimary}>Start</button>
          )}
          {isRunning && (
            <>
              <button onClick={pause} className={btnFocusSecondary}>
                <Pause size={14} /> Pause
              </button>
              <button onClick={() => { pause(); setEarlyPrompt(true) }} className={btnFocusPrimary}>
                Finish early
              </button>
            </>
          )}
          {isPaused && (
            <>
              <button onClick={resume} className={btnFocusPrimary}>
                <Play size={14} /> Resume
              </button>
              <button onClick={() => setEarlyPrompt(true)} className={btnFocusSecondary}>
                Finish early
              </button>
            </>
          )}
        </div>
      )}

      {/* Post-session congrats */}
      {isCompleted && (
        <div className="flex flex-col items-center gap-6 text-center px-6">
          <CheckCircle size={48} className="text-green-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Session complete!</h2>
            <p className="mt-2 text-sm text-gray-500 italic">&ldquo;{doneQuote}&rdquo;</p>
          </div>
          <button
            onClick={onDone}
            className="rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 transition"
          >
            Back to setup
          </button>
        </div>
      )}
    </div>
  )
}

// ─── FocusClient ──────────────────────────────────────────────────────────────

interface FocusClientProps {
  materials: StudyMaterial[]
  exams: Exam[]
  plan: string
}

export default function FocusClient({ materials, exams, plan }: FocusClientProps) {
  const [selectedMaterialId, setSelectedMaterialId] = useState('')
  const [durationSec, setDurationSec] = useState(25 * 60)
  const [customMinutes, setCustomMinutes] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [sound, setSound] = useState<Sound>('none')
  const [sessionKey, setSessionKey] = useState(0)
  const [inFocus, setInFocus] = useState(false)

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId)

  const byExam = exams.map(exam => ({
    exam,
    materials: materials.filter(m => m.exam_id === exam.id),
  })).filter(g => g.materials.length > 0)

  // ─── Locked (free users) ─────────────────────────────────────────────────────
  if (plan !== 'pro') {
    return (
      <div className="w-full max-w-sm text-center flex flex-col items-center gap-5">
        <div className="w-16 h-16 bg-[#EBD5D0] rounded-full flex items-center justify-center">
          <Lock size={24} className="text-[#C8A7A1]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#3D2B26]">Focus Mode</h2>
          <p className="mt-2 text-sm text-[#8C7B75] leading-relaxed">
            Distraction-free, screen-blocking study sessions with ambient sound are a Pro feature.
          </p>
        </div>
        <a
          href="/settings"
          className="rounded-lg bg-[#C8A7A1] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#B89390] transition shadow-[0_4px_12px_rgba(200,167,161,0.3)]"
        >
          Upgrade to Pro
        </a>
        <a href="/dashboard" className="text-sm text-[#A38F86] hover:text-[#5C4A45] transition">
          ← Back to dashboard
        </a>
      </div>
    )
  }

  function handleDone() {
    setInFocus(false)
    setSelectedMaterialId('')
    setSessionKey(k => k + 1)
  }

  function handleCancel() {
    setInFocus(false)
    setSelectedMaterialId('')
  }

  // ─── Fullscreen focus session ─────────────────────────────────────────────────
  if (inFocus && selectedMaterial) {
    return (
      <FocusSession
        key={sessionKey}
        material={selectedMaterial}
        durationSec={durationSec}
        sound={sound}
        onDone={handleDone}
        onCancel={handleCancel}
      />
    )
  }

  // ─── No materials ─────────────────────────────────────────────────────────────
  if (materials.length === 0) {
    return (
      <div className="text-center">
        <p className="text-[#8C7B75] text-sm">No study materials yet.</p>
        <a href="/materials" className="mt-3 inline-block text-sm font-medium text-[#C8A7A1] hover:text-[#B89390] transition">
          Add materials →
        </a>
      </div>
    )
  }

  // ─── Setup screen ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-palatino text-3xl font-bold text-[#3D2B26]">Focus</h1>
        <p className="mt-1 text-sm text-[#8C7B75]">Block distractions and study deeply</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#5C4A45] mb-1">Material</label>
        <select
          value={selectedMaterialId}
          onChange={e => setSelectedMaterialId(e.target.value)}
          className="w-full rounded-lg border border-[#EDEAE3] bg-[#FAF9F7] px-3 py-2 text-sm text-[#3D2B26] outline-none focus:border-[#C8A7A1] focus:ring-1 focus:ring-[#C8A7A1]"
        >
          <option value="" disabled>Select a material…</option>
          {byExam.map(({ exam, materials: mats }) => (
            <optgroup key={exam.id} label={exam.subject}>
              {mats.map(m => (
                <option key={m.id} value={m.id}>{m.title} ({m.unit_label}s)</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#5C4A45] mb-2">Session length</label>
        <div className="flex gap-2">
          {DURATIONS.map(d => (
            <button
              key={d.sec}
              onClick={() => { setDurationSec(d.sec); setIsCustom(false); setCustomMinutes('') }}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                !isCustom && durationSec === d.sec
                  ? 'border-[#C8A7A1] bg-[#C8A7A1] text-white shadow-[0_4px_12px_rgba(200,167,161,0.3)]'
                  : 'border-[#EDEAE3] text-[#5C4A45] hover:border-[#A38F86]'
              }`}
            >
              {d.label}
            </button>
          ))}
          <button
            onClick={() => setIsCustom(true)}
            className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
              isCustom
                ? 'border-[#C8A7A1] bg-[#C8A7A1] text-white shadow-[0_4px_12px_rgba(200,167,161,0.3)]'
                : 'border-[#EDEAE3] text-[#5C4A45] hover:border-[#A38F86]'
            }`}
          >
            Custom
          </button>
        </div>
        {isCustom && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={480}
              placeholder="e.g. 90"
              value={customMinutes}
              onChange={e => {
                setCustomMinutes(e.target.value)
                const mins = parseInt(e.target.value, 10)
                if (!isNaN(mins) && mins > 0) setDurationSec(mins * 60)
              }}
              className="w-24 rounded-lg border border-[#EDEAE3] bg-[#FAF9F7] px-3 py-2 text-sm text-[#3D2B26] text-center outline-none focus:border-[#C8A7A1] focus:ring-1 focus:ring-[#C8A7A1]"
              autoFocus
            />
            <span className="text-sm text-[#8C7B75]">minutes</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#5C4A45] mb-2">Ambient sound</label>
        <div className="flex gap-2">
          {SOUNDS.map(s => (
            <button
              key={s.id}
              onClick={() => setSound(s.id)}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                sound === s.id
                  ? 'border-[#C8A7A1] bg-[#C8A7A1] text-white shadow-[0_4px_12px_rgba(200,167,161,0.3)]'
                  : 'border-[#EDEAE3] text-[#5C4A45] hover:border-[#A38F86]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => selectedMaterial && setInFocus(true)}
        disabled={!selectedMaterialId || (isCustom && durationSec <= 0)}
        className="rounded-lg bg-[#C8A7A1] py-3 text-sm font-medium text-white hover:bg-[#B89390] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-[0_4px_12px_rgba(200,167,161,0.3)]"
      >
        Enter Focus
      </button>
    </div>
  )
}

const btnFocusPrimary   = 'flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 transition'
const btnFocusSecondary = 'flex items-center gap-1.5 rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-300 hover:border-gray-400 hover:text-white transition'

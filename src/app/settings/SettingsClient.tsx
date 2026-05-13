'use client'

import React, { useTransition } from 'react'
import { saveSettingsAction } from './actions'

interface Props {
  nightStart: string
  nightEnd: string
  dailyStudyMinutes: number
  breakLengthMinutes: number
  bufferMinutes: number
  maxSubjectsPerDay: number | null
}

export default function SettingsClient({ nightStart, nightEnd, dailyStudyMinutes, breakLengthMinutes, bufferMinutes, maxSubjectsPerDay }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(() => { saveSettingsAction(formData) })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

      {/* Daily study goal */}
      <div className="rounded-xl border border-[#EDEAE3] bg-[#FAF9F7] shadow-[0_2px_8px_rgba(163,143,134,0.1)] px-5 py-5">
        <h2 className="text-sm font-semibold text-[#5C4A45] mb-1">Daily study goal</h2>
        <p className="text-xs text-[#A38F86] mb-4">
          Maximum minutes per day the scheduler can assign. Keeps your plan realistic.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            name="daily_study_minutes"
            defaultValue={dailyStudyMinutes}
            min={15}
            max={720}
            step={15}
            required
            className="w-24 rounded-lg border border-[#EDEAE3] bg-[#FAF9F7] px-3 py-2 text-sm text-[#3D2B26] focus:border-[#C8A7A1] focus:outline-none"
          />
          <span className="text-sm text-[#8C7B75]">minutes / day</span>
        </div>
      </div>

      {/* Subjects per day */}
      <div className="rounded-xl border border-[#EDEAE3] bg-[#FAF9F7] shadow-[0_2px_8px_rgba(163,143,134,0.1)] px-5 py-5">
        <h2 className="text-sm font-semibold text-[#5C4A45] mb-1">Subjects per day</h2>
        <p className="text-xs text-[#A38F86] mb-4">
          How many different subjects the scheduler can assign on the same day. Set to 1 if you prefer to focus on one subject at a time.
        </p>
        <select
          name="max_subjects_per_day"
          defaultValue={maxSubjectsPerDay ?? ''}
          className="rounded-lg border border-[#EDEAE3] bg-[#FAF9F7] px-3 py-2 text-sm text-[#3D2B26] focus:border-[#C8A7A1] focus:outline-none"
        >
          <option value="">No limit</option>
          <option value="1">1 subject / day</option>
          <option value="2">2 subjects / day</option>
          <option value="3">3 subjects / day</option>
        </select>
      </div>

      {/* Study session settings */}
      <div className="rounded-xl border border-[#EDEAE3] bg-[#FAF9F7] shadow-[0_2px_8px_rgba(163,143,134,0.1)] px-5 py-5">
        <h2 className="text-sm font-semibold text-[#5C4A45] mb-1">Study session settings</h2>
        <p className="text-xs text-[#A38F86] mb-4">
          Controls how study blocks are auto-placed in your calendar.
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <input
              type="number" name="break_length_minutes"
              defaultValue={breakLengthMinutes} min={5} max={60} step={5} required
              className="w-24 rounded-lg border border-[#EDEAE3] bg-[#FAF9F7] px-3 py-2 text-sm text-[#3D2B26] focus:border-[#C8A7A1] focus:outline-none"
            />
            <span className="text-sm text-[#8C7B75]">minutes break between sessions</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number" name="buffer_minutes"
              defaultValue={bufferMinutes} min={0} max={120} step={15} required
              className="w-24 rounded-lg border border-[#EDEAE3] bg-[#FAF9F7] px-3 py-2 text-sm text-[#3D2B26] focus:border-[#C8A7A1] focus:outline-none"
            />
            <span className="text-sm text-[#8C7B75]">minutes buffer before / after events</span>
          </div>
        </div>
      </div>

      {/* Night window */}
      <div className="rounded-xl border border-[#EDEAE3] bg-[#FAF9F7] shadow-[0_2px_8px_rgba(163,143,134,0.1)] px-5 py-5">
        <h2 className="text-sm font-semibold text-[#5C4A45] mb-1">Nighttime window</h2>
        <p className="text-xs text-[#A38F86] mb-4">
          Hours treated as unavailable for studying (e.g. sleep time).
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#8C7B75] w-8">From</label>
            <input
              type="time"
              name="night_start"
              defaultValue={nightStart}
              required
              className="rounded-lg border border-[#EDEAE3] bg-[#FAF9F7] px-3 py-2 text-sm text-[#3D2B26] focus:border-[#C8A7A1] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#8C7B75] w-4">to</label>
            <input
              type="time"
              name="night_end"
              defaultValue={nightEnd}
              required
              className="rounded-lg border border-[#EDEAE3] bg-[#FAF9F7] px-3 py-2 text-sm text-[#3D2B26] focus:border-[#C8A7A1] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-[#C8A7A1] px-4 py-2 text-sm font-medium text-white hover:bg-[#B89390] disabled:opacity-50 transition shadow-[0_4px_12px_rgba(200,167,161,0.3)]"
      >
        {isPending ? 'Saving…' : 'Save settings'}
      </button>

    </form>
  )
}

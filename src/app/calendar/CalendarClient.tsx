'use client'

import React, { useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Repeat, Calendar, RotateCcw, Ban } from 'lucide-react'
import {
  addRecurringEventAction,
  removeRecurringEventAction,
  addCalendarEventAction,
  removeCalendarEventAction,
  resetStudyBlocksForDateAction,
  createStudyBlocksForDateAction,
  blockDayAction,
  unblockDayAction,
} from './actions'
import { getFreeWindows } from '@/lib/scheduler'
import type { RecurringEvent, CalendarEvent, StudyBlock } from '@/types'
import type { ScheduledMaterialInfo } from './page'

interface Props {
  recurringEvents: RecurringEvent[]
  calendarEvents: CalendarEvent[]
  savedStudyBlocks: StudyBlock[]
  blockedDates: string[]
  today: string
  nightStartMin: number
  nightEndMin: number
  breakLengthMin: number
  bufferMin: number
  dailyStudyMinutes: number
  scheduledMaterialsByDate: Record<string, ScheduledMaterialInfo[]>
  examIds: string[]
  examSubjects: Record<string, string>
}

interface MaterialBlockItem {
  id: string | null
  startMin: number
  endMin: number
  materialId: string | null
  materialTitle: string | null
  examId: string | null
}

// ─── Color palette ────────────────────────────────────────────────────────────

const EXAM_PALETTE = [
  { bg: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-800', sub: 'text-emerald-600', hover: 'hover:bg-emerald-200', swatch: 'bg-emerald-200' },
  { bg: 'bg-violet-100',  border: 'border-violet-200',  text: 'text-violet-800',  sub: 'text-violet-600',  hover: 'hover:bg-violet-200',  swatch: 'bg-violet-200'  },
  { bg: 'bg-rose-100',    border: 'border-rose-200',    text: 'text-rose-800',    sub: 'text-rose-600',    hover: 'hover:bg-rose-200',    swatch: 'bg-rose-200'    },
  { bg: 'bg-orange-100',  border: 'border-orange-200',  text: 'text-orange-800',  sub: 'text-orange-600',  hover: 'hover:bg-orange-200',  swatch: 'bg-orange-200'  },
  { bg: 'bg-cyan-100',    border: 'border-cyan-200',    text: 'text-cyan-800',    sub: 'text-cyan-600',    hover: 'hover:bg-cyan-200',    swatch: 'bg-cyan-200'    },
] as const

const GENERIC_STUDY_COLOR = {
  bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-800',
  sub: 'text-green-600', hover: 'hover:bg-green-200', swatch: 'bg-green-200',
}

type PaletteColor = (typeof EXAM_PALETTE)[number] | typeof GENERIC_STUDY_COLOR

function getExamColor(examId: string | null, examIds: string[]): PaletteColor {
  if (!examId) return GENERIC_STUDY_COLOR
  const idx = examIds.indexOf(examId)
  if (idx === -1) return GENERIC_STUDY_COLOR
  return EXAM_PALETTE[idx % EXAM_PALETTE.length]
}

// ─── Per-material block placement ─────────────────────────────────────────────

function computeAutoMaterialBlocks(
  materials: ScheduledMaterialInfo[],
  freeWindows: [number, number][],
  breakLengthMin: number,
): MaterialBlockItem[] {
  if (materials.length === 0 || freeWindows.length === 0) return []

  const result: MaterialBlockItem[] = []
  let gapIdx = 0
  let pos = freeWindows[0][0]

  for (const mat of materials) {
    let remaining = Math.max(5, Math.round(mat.durationMin))

    while (remaining > 0 && gapIdx < freeWindows.length) {
      const [gapStart, gapEnd] = freeWindows[gapIdx]
      if (pos < gapStart) pos = gapStart
      if (pos >= gapEnd) {
        gapIdx++
        if (gapIdx < freeWindows.length) pos = freeWindows[gapIdx][0]
        continue
      }

      const avail = gapEnd - pos
      if (avail < 5) {
        gapIdx++
        if (gapIdx < freeWindows.length) pos = freeWindows[gapIdx][0]
        continue
      }

      const blockLen = Math.min(remaining, avail)
      result.push({
        id: null,
        startMin: pos,
        endMin: pos + blockLen,
        materialId: mat.material_id,
        materialTitle: mat.title,
        examId: mat.exam_id,
      })
      remaining -= blockLen
      pos += blockLen + breakLengthMin
    }

    if (gapIdx >= freeWindows.length) break
  }

  return result
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 56
const START_HOUR  = 6
const END_HOUR    = 23
const TOTAL_HOURS = END_HOUR - START_HOUR

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_JS     = [1, 2, 3, 4, 5, 6, 0]
const DAY_FULL   = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DOW_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseHM(timeStr: string): { h: number; m: number } {
  const [h, m] = timeStr.split(':').map(Number)
  return { h, m }
}

function timeToY(timeStr: string): number {
  const { h, m } = parseHM(timeStr)
  return ((h + m / 60) - START_HOUR) * HOUR_HEIGHT
}

function durationPx(start: string, end: string): number {
  const s = parseHM(start)
  const e = parseHM(end)
  const mins = (e.h * 60 + e.m) - (s.h * 60 + s.m)
  return Math.max(20, (mins / 60) * HOUR_HEIGHT)
}

function fmtTime(timeStr: string): string {
  const { h, m } = parseHM(timeStr)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function parseHMMin(t: string): number {
  const { h, m } = parseHM(t)
  return h * 60 + m
}

function minsToHM(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

function weekStart(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date
}

function addDaysToDate(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateHeader(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function isoToLocalTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function isoToLocalDate(iso: string): string {
  const d = new Date(iso)
  return toDateStr(d)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarClient({
  recurringEvents, calendarEvents, savedStudyBlocks, blockedDates, today,
  nightStartMin, nightEndMin, breakLengthMin, bufferMin,
  dailyStudyMinutes, scheduledMaterialsByDate, examIds, examSubjects,
}: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [panel, setPanel] = useState<'none' | 'recurring' | 'oneoff'>('none')
  const [isPending, startTransition] = useTransition()
  const [localBlocked, setLocalBlocked] = useState<Set<string>>(() => new Set(blockedDates))
  const [confirmBlockDate, setConfirmBlockDate] = useState<string | null>(null)
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => {
    const mon = weekStart(today)
    const strs = Array.from({ length: 7 }, (_, i) => toDateStr(addDaysToDate(mon, i)))
    const idx = strs.indexOf(today)
    return idx >= 0 ? idx : 0
  })

  const [blocksByDate, setBlocksByDate] = useState<Record<string, MaterialBlockItem[]>>(() => {
    const map: Record<string, MaterialBlockItem[]> = {}
    for (const b of savedStudyBlocks) {
      if (!map[b.block_date]) map[b.block_date] = []
      map[b.block_date].push({
        id: b.id,
        startMin: parseHMMin(b.start_time),
        endMin: parseHMMin(b.end_time),
        materialId: null,
        materialTitle: null,
        examId: null,
      })
    }
    return map
  })

  // Drag state
  const dragRef = React.useRef<{
    date: string; blockIdx: number
    origStartMin: number; duration: number
    startMouseY: number; currentStartMin: number
  } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragPos, setDragPos] = useState<{ date: string; idx: number; startMin: number } | null>(null)

  const commitRef = React.useRef<(date: string, idx: number, startMin: number, endMin: number) => void>(() => {})
  commitRef.current = (date, idx, newStart, newEnd) => {
    const jsDay = weekDates.find(d => toDateStr(d) === date)?.getDay() ?? 0
    const recForDay    = recurringEvents.filter(e => e.day_of_week === jsDay)
    const oneOffForDay = calendarEvents.filter(e => isoToLocalDate(e.start_time) === date)

    const freeWins = getFreeWindows({
      recurringEventsForDay: recForDay.map(e => ({ start_time: e.start_time, end_time: e.end_time })),
      oneOffEventsForDay: oneOffForDay.map(e => ({ start_time: isoToLocalTime(e.start_time), end_time: isoToLocalTime(e.end_time) })),
      nightEndMin, nightStartMin, bufferMin,
    })
    const autoItems = computeAutoMaterialBlocks(
      scheduledMaterialsByDate[date] ?? [],
      freeWins,
      breakLengthMin,
    )

    const savedBlocks    = blocksByDate[date]
    const hasMaterialSav = savedBlocks?.some(b => b.materialId !== null) ?? false
    const current: MaterialBlockItem[] = (hasMaterialSav ? savedBlocks! : null) ?? autoItems
    const updated = current.map((b, i) =>
      i === idx ? { ...b, startMin: newStart, endMin: newEnd, id: null } : b
    )
    setBlocksByDate(prev => ({ ...prev, [date]: updated }))
    startTransition(async () => {
      await resetStudyBlocksForDateAction(date)
      const ids = await createStudyBlocksForDateAction(
        date,
        updated.map(b => ({ start_time: minsToHM(b.startMin), end_time: minsToHM(b.endMin) })),
      )
      setBlocksByDate(prev => ({ ...prev, [date]: updated.map((b, i) => ({ ...b, id: ids[i] })) }))
    })
  }

  // Recurring form state
  const [rTitle, setRTitle] = useState('')
  const [rDay, setRDay]     = useState(1)
  const [rStart, setRStart] = useState('09:00')
  const [rEnd, setREnd]     = useState('11:00')

  // One-off form state
  const [oTitle, setOTitle] = useState('')
  const [oDate, setODate]   = useState(today)
  const [oStart, setOStart] = useState('09:00')
  const [oEnd, setOEnd]     = useState('10:00')

  const monday    = weekStart(today)
  monday.setDate(monday.getDate() + weekOffset * 7)
  const weekDates    = Array.from({ length: 7 }, (_, i) => addDaysToDate(monday, i))
  const weekDateStrs = weekDates.map(toDateStr)

  // ─── Block day toggle ─────────────────────────────────────────────────────

  function handleToggleBlock(dateStr: string) {
    const isBlocked = localBlocked.has(dateStr)
    setLocalBlocked(prev => {
      const next = new Set(prev)
      if (isBlocked) next.delete(dateStr)
      else next.add(dateStr)
      return next
    })
    startTransition(async () => {
      if (isBlocked) await unblockDayAction(dateStr)
      else await blockDayAction(dateStr)
    })
  }

  // ─── Submit handlers ───────────────────────────────────────────────────────

  function handleAddRecurring(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('title',       rTitle)
    fd.set('day_of_week', String(rDay))
    fd.set('start_time',  rStart)
    fd.set('end_time',    rEnd)
    startTransition(async () => {
      await addRecurringEventAction(fd)
      setRTitle(''); setRStart('09:00'); setREnd('11:00')
    })
  }

  function handleAddOneOff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('title',      oTitle)
    fd.set('date',       oDate)
    fd.set('start_time', oStart)
    fd.set('end_time',   oEnd)
    startTransition(async () => {
      await addCalendarEventAction(fd)
      setOTitle(''); setOStart('09:00'); setOEnd('10:00')
    })
  }

  function handleDeleteRecurring(id: string) {
    startTransition(() => removeRecurringEventAction(id))
  }

  function handleDeleteOneOff(id: string) {
    startTransition(() => removeCalendarEventAction(id))
  }

  // ─── Drag ─────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => {
      const dr = dragRef.current
      if (!dr) return
      const deltaMin = Math.round(((e.clientY - dr.startMouseY) / HOUR_HEIGHT) * 60 / 15) * 15
      dr.currentStartMin = Math.max(
        START_HOUR * 60,
        Math.min((END_HOUR - 1) * 60 - dr.duration, dr.origStartMin + deltaMin),
      )
      setDragPos({ date: dr.date, idx: dr.blockIdx, startMin: dr.currentStartMin })
    }
    const onUp = () => {
      const dr = dragRef.current
      if (!dr) return
      const { date, blockIdx, currentStartMin, duration } = dr
      dragRef.current = null
      setIsDragging(false)
      setDragPos(null)
      commitRef.current(date, blockIdx, currentStartMin, currentStartMin + duration)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [isDragging])

  function startBlockDrag(e: React.MouseEvent, date: string, blockIdx: number, block: MaterialBlockItem) {
    e.preventDefault()
    dragRef.current = {
      date, blockIdx,
      origStartMin: block.startMin,
      duration: block.endMin - block.startMin,
      startMouseY: e.clientY,
      currentStartMin: block.startMin,
    }
    setIsDragging(true)
    setDragPos({ date, idx: blockIdx, startMin: block.startMin })
  }

  function handleResetDay(date: string) {
    if (!blocksByDate[date]) return
    startTransition(async () => {
      await resetStudyBlocksForDateAction(date)
      setBlocksByDate(prev => { const n = { ...prev }; delete n[date]; return n })
    })
  }

  // ─── Grid rendering ────────────────────────────────────────────────────────

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i)

  return (
    <div className="flex flex-col gap-6">

      {/* ── Week nav + add buttons ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-1.5 rounded-lg border border-[#EDEAE3] hover:border-[#A38F86] transition"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-[#5C4A45] min-w-[140px] text-center">
            {formatDateHeader(weekDates[0])} – {formatDateHeader(weekDates[6])}
          </span>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-1.5 rounded-lg border border-[#EDEAE3] hover:border-[#A38F86] transition"
          >
            <ChevronRight size={16} />
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs text-[#A38F86] hover:text-[#5C4A45] transition ml-1"
            >
              Today
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setPanel(p => p === 'recurring' ? 'none' : 'recurring')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              panel === 'recurring'
                ? 'border-[#C8A7A1] bg-[#C8A7A1] text-white shadow-[0_4px_12px_rgba(200,167,161,0.3)]'
                : 'border-[#EDEAE3] text-[#5C4A45] hover:border-[#A38F86]'
            }`}
          >
            <Repeat size={13} />
            Weekly schedule
          </button>
          <button
            onClick={() => setPanel(p => p === 'oneoff' ? 'none' : 'oneoff')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              panel === 'oneoff'
                ? 'border-[#C8A7A1] bg-[#C8A7A1] text-white shadow-[0_4px_12px_rgba(200,167,161,0.3)]'
                : 'border-[#EDEAE3] text-[#5C4A45] hover:border-[#A38F86]'
            }`}
          >
            <Plus size={13} />
            One-off event
          </button>
        </div>
      </div>

      {/* ── Block day confirmation ── */}
      {confirmBlockDate && (
        <div className="rounded-xl border border-[#D6A49A] bg-[#FDF4F0] px-5 py-3 flex items-center justify-between gap-4 shadow-[0_2px_8px_rgba(214,164,154,0.15)]">
          <div>
            <p className="text-sm font-semibold text-[#7A4A42]">
              Block {confirmBlockDate}?
            </p>
            <p className="text-xs text-[#9A6A62] mt-0.5">
              No study sessions will be scheduled for this day. Your remaining workload will be spread across your other available days.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => { handleToggleBlock(confirmBlockDate); setConfirmBlockDate(null) }}
              disabled={isPending}
              className="rounded-lg bg-[#D6A49A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#C8877E] disabled:opacity-50 transition shadow-[0_2px_6px_rgba(214,164,154,0.4)]"
            >
              Block day
            </button>
            <button
              onClick={() => setConfirmBlockDate(null)}
              className="rounded-lg border border-[#EDEAE3] px-3 py-1.5 text-xs text-[#6E5850] hover:border-[#A38F86] transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Add recurring panel ── */}
      {panel === 'recurring' && (
        <form
          onSubmit={handleAddRecurring}
          className="rounded-xl border border-[#EDEAE3] bg-[#FAF9F7] px-5 py-4 flex flex-wrap gap-3 items-end shadow-[0_2px_8px_rgba(163,143,134,0.1)]"
        >
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-[#6E5850]">Title (optional)</label>
            <input
              value={rTitle}
              onChange={e => setRTitle(e.target.value)}
              placeholder="e.g. Lecture"
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6E5850]">Day</label>
            <select value={rDay} onChange={e => setRDay(Number(e.target.value))} className={inputCls}>
              {DOW_OPTIONS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6E5850]">From</label>
            <input type="time" value={rStart} onChange={e => setRStart(e.target.value)} className={inputCls} required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6E5850]">To</label>
            <input type="time" value={rEnd} onChange={e => setREnd(e.target.value)} className={inputCls} required />
          </div>
          <button type="submit" disabled={isPending} className={btnPrimary}>
            {isPending ? 'Saving…' : 'Add'}
          </button>
        </form>
      )}

      {/* ── Add one-off panel ── */}
      {panel === 'oneoff' && (
        <form
          onSubmit={handleAddOneOff}
          className="rounded-xl border border-[#EDEAE3] bg-[#FAF9F7] px-5 py-4 flex flex-wrap gap-3 items-end shadow-[0_2px_8px_rgba(163,143,134,0.1)]"
        >
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-[#6E5850]">Title (optional)</label>
            <input
              value={oTitle}
              onChange={e => setOTitle(e.target.value)}
              placeholder="e.g. Doctor's appointment"
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6E5850]">Date</label>
            <input type="date" value={oDate} onChange={e => setODate(e.target.value)} className={inputCls} required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6E5850]">From</label>
            <input type="time" value={oStart} onChange={e => setOStart(e.target.value)} className={inputCls} required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6E5850]">To</label>
            <input type="time" value={oEnd} onChange={e => setOEnd(e.target.value)} className={inputCls} required />
          </div>
          <button type="submit" disabled={isPending} className={btnPrimary}>
            {isPending ? 'Saving…' : 'Add'}
          </button>
        </form>
      )}

      {/* ── Mobile: day tabs + single column ── */}
      <div className="sm:hidden flex flex-col gap-3">
        {/* Day selector pills */}
        <div className="flex gap-1">
          {weekDates.map((date, i) => {
            const dateStr   = weekDateStrs[i]
            const isToday   = dateStr === today
            const isSelected = i === selectedDayIdx
            const isBlocked = localBlocked.has(dateStr)
            return (
              <button
                key={i}
                onClick={() => setSelectedDayIdx(i)}
                className={`flex flex-col items-center gap-0.5 flex-1 py-2 rounded-xl transition-colors ${
                  isSelected
                    ? 'bg-[#3D2B26] text-[#F5F1EB]'
                    : isBlocked
                    ? 'bg-red-50 text-red-400'
                    : isToday
                    ? 'bg-[#EDEAE3] text-[#3D2B26]'
                    : 'text-[#8C7B75]'
                }`}
              >
                <span className="text-[9px] font-semibold uppercase tracking-wider">{DAY_LABELS[i]}</span>
                <span className="text-sm font-bold">{date.getDate()}</span>
              </button>
            )
          })}
        </div>

        {(() => {
          const colIdx    = selectedDayIdx
          const date      = weekDates[colIdx]
          const dateStr   = weekDateStrs[colIdx]
          const jsDay     = date.getDay()
          const isToday   = dateStr === today
          const isBlocked = localBlocked.has(dateStr)

          const recEvents = recurringEvents.filter(e => e.day_of_week === jsDay)
          const oneOffs   = calendarEvents.filter(e => isoToLocalDate(e.start_time) === dateStr)

          const savedForDay      = blocksByDate[dateStr]
          const hasMaterialSaved = savedForDay?.some(b => b.materialId !== null) ?? false
          const hasSaved         = hasMaterialSaved
          const freeWins = getFreeWindows({
            recurringEventsForDay: recEvents.map(e => ({ start_time: e.start_time, end_time: e.end_time })),
            oneOffEventsForDay: oneOffs.map(e => ({ start_time: isoToLocalTime(e.start_time), end_time: isoToLocalTime(e.end_time) })),
            nightEndMin, nightStartMin, bufferMin,
          })
          const displayBlocks: MaterialBlockItem[] = isBlocked
            ? []
            : (hasMaterialSaved ? savedForDay! : null)
              ?? computeAutoMaterialBlocks(scheduledMaterialsByDate[dateStr] ?? [], freeWins, breakLengthMin)

          return (
            <div className="rounded-xl border border-[#EDEAE3] bg-[#FAF9F7] overflow-hidden shadow-[0_2px_8px_rgba(163,143,134,0.1)]">
              {/* Day header */}
              <div className={`flex items-center justify-between px-4 py-2.5 border-b border-[#EDEAE3] ${isBlocked ? 'bg-red-50' : ''}`}>
                <p className="text-sm font-semibold text-[#3D2B26]">
                  {DAY_FULL[colIdx]}, {formatDateHeader(date)}
                </p>
                <div className="flex items-center gap-2">
                  {hasSaved && (
                    <button
                      onClick={() => handleResetDay(dateStr)}
                      title="Reset study blocks to auto"
                      className="p-1 rounded text-[#C4B3AC] hover:text-[#5C4A45] transition"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => isBlocked ? handleToggleBlock(dateStr) : setConfirmBlockDate(dateStr)}
                    title={isBlocked ? 'Unblock day' : 'Block this day'}
                    className={`p-1 rounded transition ${isBlocked ? 'text-red-400' : 'text-[#D2C4B5] hover:text-[#8C7B75]'}`}
                  >
                    <Ban size={14} />
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative flex" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
                <div className="w-12 shrink-0 relative">
                  {hours.slice(0, -1).map(h => (
                    <div
                      key={h}
                      className="absolute right-2 text-[10px] text-[#C4B3AC] leading-none"
                      style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 6 }}
                    >
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                <div className={`flex-1 relative border-l border-[#EDEAE3] ${isToday ? 'bg-blue-50/30' : ''}`}>
                  {hours.map(h => (
                    <div key={h} className="absolute w-full border-t border-[#EDEAE3]" style={{ top: (h - START_HOUR) * HOUR_HEIGHT }} />
                  ))}

                  {isBlocked && (
                    <div className="absolute inset-0 z-10 bg-red-50/70 flex flex-col items-center justify-center gap-2 pointer-events-none">
                      <Ban size={20} className="text-red-300" />
                      <span className="text-xs font-medium text-red-300 uppercase tracking-wide">Blocked</span>
                    </div>
                  )}

                  {recEvents.map(ev => {
                    const top    = timeToY(ev.start_time)
                    const height = durationPx(ev.start_time, ev.end_time)
                    if (top < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null
                    return (
                      <div key={ev.id} className="absolute left-1 right-1 rounded-lg bg-blue-100 border border-blue-200 px-2 py-1 overflow-hidden" style={{ top, height }}>
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-blue-800 truncate leading-tight">{ev.title || DAY_FULL[DAY_JS.indexOf(ev.day_of_week)]}</p>
                            <p className="text-[10px] text-blue-600 leading-tight">{fmtTime(ev.start_time)}–{fmtTime(ev.end_time)}</p>
                          </div>
                          <button onClick={() => handleDeleteRecurring(ev.id)} disabled={isPending} className="shrink-0 text-blue-400 hover:text-blue-700"><X size={12} /></button>
                        </div>
                      </div>
                    )
                  })}

                  {oneOffs.map(ev => {
                    const startLocal = isoToLocalTime(ev.start_time)
                    const endLocal   = isoToLocalTime(ev.end_time)
                    const top    = timeToY(startLocal)
                    const height = durationPx(startLocal, endLocal)
                    if (top < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null
                    return (
                      <div key={ev.id} className="absolute left-1 right-1 rounded-lg bg-amber-100 border border-amber-200 px-2 py-1 overflow-hidden" style={{ top, height }}>
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-amber-800 truncate leading-tight">{ev.title || 'Event'}</p>
                            <p className="text-[10px] text-amber-600 leading-tight">{startLocal}–{endLocal}</p>
                          </div>
                          <button onClick={() => handleDeleteOneOff(ev.id)} disabled={isPending} className="shrink-0 text-amber-400 hover:text-amber-700"><X size={12} /></button>
                        </div>
                      </div>
                    )
                  })}

                  {displayBlocks.map((block, idx) => {
                    const top    = (block.startMin - START_HOUR * 60) / 60 * HOUR_HEIGHT
                    const height = Math.max(28, (block.endMin - block.startMin) / 60 * HOUR_HEIGHT)
                    const color  = getExamColor(block.examId, examIds)
                    return (
                      <div key={idx} className={`absolute left-1 right-1 rounded-lg border px-2 py-1 overflow-hidden ${color.bg} ${color.border}`} style={{ top, height }}>
                        <p className={`text-xs font-semibold ${color.text} leading-tight truncate`}>{block.materialTitle ?? 'Study'}</p>
                        <p className={`text-[10px] ${color.sub} leading-tight`}>{minsToHM(block.startMin)}–{minsToHM(block.endMin)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Desktop: 7-column weekly grid ── */}
      <div className="hidden sm:block rounded-xl border border-[#EDEAE3] bg-[#FAF9F7] overflow-hidden shadow-[0_2px_8px_rgba(163,143,134,0.1)]">
        {/* Day headers */}
        <div className="grid border-b border-[#EDEAE3]" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
          <div />
          {weekDates.map((date, i) => {
            const dateStr  = weekDateStrs[i]
            const isToday   = dateStr === today
            const isBlocked = localBlocked.has(dateStr)
            return (
              <div
                key={i}
                className={`py-2 text-center border-l border-[#EDEAE3] first:border-l-0 relative group ${isBlocked ? 'bg-red-50' : ''}`}
              >
                <p className={`text-xs font-medium ${isBlocked ? 'text-red-400' : isToday ? 'text-[#3D2B26]' : 'text-[#A38F86]'}`}>
                  {DAY_LABELS[i]}
                </p>
                <p className={`text-sm font-semibold mt-0.5 ${isBlocked ? 'text-red-400' : isToday ? 'text-[#3D2B26]' : 'text-[#8C7B75]'}`}>
                  {date.getDate()}
                </p>
                <button
                  onClick={() => isBlocked ? handleToggleBlock(dateStr) : setConfirmBlockDate(dateStr)}
                  title={isBlocked ? 'Unblock day' : 'Block this day (no studying)'}
                  className={`mt-0.5 rounded p-0.5 transition ${
                    isBlocked
                      ? 'text-red-400 hover:text-red-600'
                      : 'text-[#D2C4B5] hover:text-[#8C7B75] opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <Ban size={10} />
                </button>
              </div>
            )
          })}
        </div>

        {/* Time grid */}
        <div className="relative flex" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>

          {/* Hour labels */}
          <div className="w-12 shrink-0 relative">
            {hours.slice(0, -1).map(h => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-[#C4B3AC] leading-none"
                style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 6 }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((date, colIdx) => {
            const dateStr   = weekDateStrs[colIdx]
            const jsDay     = date.getDay()
            const isToday   = dateStr === today
            const isBlocked = localBlocked.has(dateStr)

            const recEvents = recurringEvents.filter(e => e.day_of_week === jsDay)
            const oneOffs   = calendarEvents.filter(e => isoToLocalDate(e.start_time) === dateStr)

            const savedForDay = blocksByDate[dateStr]
            const hasMaterialSaved = savedForDay?.some(b => b.materialId !== null) ?? false
            const hasSaved = hasMaterialSaved
            const freeWins = getFreeWindows({
              recurringEventsForDay: recEvents.map(e => ({ start_time: e.start_time, end_time: e.end_time })),
              oneOffEventsForDay: oneOffs.map(e => ({ start_time: isoToLocalTime(e.start_time), end_time: isoToLocalTime(e.end_time) })),
              nightEndMin, nightStartMin, bufferMin,
            })

            const displayBlocks: MaterialBlockItem[] = isBlocked
              ? []
              : (hasMaterialSaved ? savedForDay! : null)
                ?? computeAutoMaterialBlocks(
                  scheduledMaterialsByDate[dateStr] ?? [],
                  freeWins,
                  breakLengthMin,
                )

            return (
              <div
                key={colIdx}
                className={`flex-1 relative border-l border-[#EDEAE3] ${isToday ? 'bg-blue-50/30' : ''}`}
              >
                {hours.map(h => (
                  <div key={h} className="absolute w-full border-t border-[#EDEAE3]" style={{ top: (h - START_HOUR) * HOUR_HEIGHT }} />
                ))}

                {isBlocked && (
                  <div className="absolute inset-0 z-10 bg-red-50/70 flex flex-col items-center justify-center gap-1 pointer-events-none">
                    <Ban size={14} className="text-red-300" />
                    <span className="text-[9px] font-medium text-red-300 uppercase tracking-wide">Blocked</span>
                  </div>
                )}

                {recEvents.map(ev => {
                  const top    = timeToY(ev.start_time)
                  const height = durationPx(ev.start_time, ev.end_time)
                  if (top < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null
                  return (
                    <div key={ev.id} className="absolute left-0.5 right-0.5 rounded bg-blue-100 border border-blue-200 px-1 py-0.5 overflow-hidden group" style={{ top, height }}>
                      <p className="text-[10px] font-medium text-blue-800 truncate leading-tight">{ev.title || DAY_FULL[DAY_JS.indexOf(ev.day_of_week)]}</p>
                      <p className="text-[9px] text-blue-600 leading-tight">{fmtTime(ev.start_time)}–{fmtTime(ev.end_time)}</p>
                      <button onClick={() => handleDeleteRecurring(ev.id)} disabled={isPending} className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition text-blue-400 hover:text-blue-700" title="Remove recurring event"><X size={10} /></button>
                    </div>
                  )
                })}

                {oneOffs.map(ev => {
                  const startLocal = isoToLocalTime(ev.start_time)
                  const endLocal   = isoToLocalTime(ev.end_time)
                  const top    = timeToY(startLocal)
                  const height = durationPx(startLocal, endLocal)
                  if (top < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null
                  return (
                    <div key={ev.id} className="absolute left-0.5 right-0.5 rounded bg-amber-100 border border-amber-200 px-1 py-0.5 overflow-hidden group" style={{ top, height }}>
                      <p className="text-[10px] font-medium text-amber-800 truncate leading-tight">{ev.title || 'Event'}</p>
                      <p className="text-[9px] text-amber-600 leading-tight">{startLocal}–{endLocal}</p>
                      <button onClick={() => handleDeleteOneOff(ev.id)} disabled={isPending} className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition text-amber-400 hover:text-amber-700" title="Remove event"><X size={10} /></button>
                    </div>
                  )
                })}

                {displayBlocks.map((block, idx) => {
                  const isActive = dragPos?.date === dateStr && dragPos.idx === idx
                  const startMin = isActive ? dragPos!.startMin : block.startMin
                  const duration = block.endMin - block.startMin
                  const top    = (startMin - START_HOUR * 60) / 60 * HOUR_HEIGHT
                  const height = Math.max(24, duration / 60 * HOUR_HEIGHT)
                  const color  = getExamColor(block.examId, examIds)
                  return (
                    <div
                      key={idx}
                      onMouseDown={e => startBlockDrag(e, dateStr, idx, block)}
                      className={`absolute left-0.5 right-0.5 rounded border px-1 py-0.5 overflow-hidden select-none ${color.bg} ${color.border} ${isActive ? 'cursor-grabbing opacity-80 z-20 shadow-md' : `cursor-grab ${color.hover}`} transition-colors`}
                      style={{ top, height }}
                    >
                      <p className={`text-[10px] font-semibold ${color.text} leading-tight truncate`}>{block.materialTitle ?? 'Study'}</p>
                      <p className={`text-[9px] ${color.sub} leading-tight`}>{minsToHM(startMin)}–{minsToHM(block.endMin)}</p>
                    </div>
                  )
                })}

                {hasSaved && (
                  <button onClick={() => handleResetDay(dateStr)} title="Reset study blocks to auto" className="absolute bottom-1 right-1 z-10 rounded p-0.5 text-[#C4B3AC] hover:text-[#5C4A45] hover:bg-[#EDEAE3] transition">
                    <RotateCcw size={9} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-5 text-xs text-[#A38F86] flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-200 inline-block" />
          <Repeat size={11} />
          Weekly schedule
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-200 inline-block" />
          <Calendar size={11} />
          One-off event
        </span>
        {examIds.map((examId, i) => {
          const color = EXAM_PALETTE[i % EXAM_PALETTE.length]
          return (
            <span key={examId} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded ${color.swatch} inline-block`} />
              {examSubjects[examId] ?? 'Study'}
            </span>
          )
        })}
        {examIds.length === 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-200 inline-block" />
            Study block
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Ban size={11} className="text-red-300" />
          Blocked day (click <Ban size={9} className="inline text-red-300" /> on day header to toggle)
        </span>
        <span className="ml-auto text-[#C4B3AC]">
          Drag to move · <RotateCcw size={9} className="inline" /> to reset day
        </span>
      </div>

    </div>
  )
}

const inputCls = 'rounded-lg border border-[#EDEAE3] bg-[#FAF9F7] px-2.5 py-1.5 text-sm text-[#3D2B26] outline-none focus:border-[#C8A7A1] focus:ring-1 focus:ring-[#C8A7A1]'
const btnPrimary = 'rounded-lg bg-[#C8A7A1] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#B89390] disabled:opacity-50 transition shadow-[0_4px_12px_rgba(200,167,161,0.25)]'

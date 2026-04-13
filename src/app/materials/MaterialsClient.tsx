'use client'

import React, { useState } from 'react'
import { Trash2, PlusCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import {
  createExam, deleteExam,
  createMaterial, deleteMaterial,
} from '@/lib/supabase/helpers'
import { calculatePace } from '@/lib/scheduler'
import type { Exam, ExamInsert, StudyMaterial, StudyMaterialInsert, StudySession } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string
  initialExams: Exam[]
  initialMaterials: StudyMaterial[]
  initialSessions: StudySession[]
}

const MATERIAL_TYPES = ['book', 'slides', 'notes', 'other'] as const
type MaterialType = typeof MATERIAL_TYPES[number]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function MaterialsClient({ userId, initialExams, initialMaterials, initialSessions }: Props) {
  const [exams, setExams] = useState<Exam[]>(initialExams)
  const [materials, setMaterials] = useState<StudyMaterial[]>(initialMaterials)
  const [sessions] = useState<StudySession[]>(initialSessions)
  const [showExamForm, setShowExamForm] = useState(false)

  const [examForm, setExamForm] = useState({
    subject: '', exam_date: '', priority: 1, revision_days: 1,
  })
  const [examError, setExamError] = useState<string | null>(null)
  const [examSaving, setExamSaving] = useState(false)

  async function handleAddExam(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setExamError(null)
    setExamSaving(true)
    try {
      const supabase = getSupabaseClient()
      const payload: ExamInsert = {
        user_id: userId,
        subject: examForm.subject.trim(),
        exam_date: examForm.exam_date,
        priority: examForm.priority,
        revision_days: examForm.revision_days,
      }
      const created = await createExam(supabase, payload)
      setExams(prev => [...prev, created].sort((a, b) => a.exam_date.localeCompare(b.exam_date)))
      setExamForm({ subject: '', exam_date: '', priority: 1, revision_days: 1 })
      setShowExamForm(false)
    } catch (err) {
      setExamError(err instanceof Error ? err.message : 'Failed to create exam')
    } finally {
      setExamSaving(false)
    }
  }

  async function handleDeleteExam(examId: string) {
    if (!confirm('Delete this exam and all its materials?')) return
    try {
      const supabase = getSupabaseClient()
      await deleteExam(supabase, examId)
      setExams(prev => prev.filter(e => e.id !== examId))
      setMaterials(prev => prev.filter(m => m.exam_id !== examId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete exam')
    }
  }

  function handleMaterialAdded(material: StudyMaterial) {
    setMaterials(prev => [...prev, material])
  }

  function handleMaterialDeleted(materialId: string) {
    setMaterials(prev => prev.filter(m => m.id !== materialId))
  }

  return (
    <div className="flex flex-col gap-4">
      {exams.length === 0 && !showExamForm && (
        <p className="text-sm text-gray-400 text-center py-8">No exams yet. Add your first one below.</p>
      )}

      {exams.map(exam => (
        <ExamCard
          key={exam.id}
          exam={exam}
          materials={materials.filter(m => m.exam_id === exam.id)}
          sessions={sessions}
          onDeleteExam={handleDeleteExam}
          onMaterialAdded={handleMaterialAdded}
          onMaterialDeleted={handleMaterialDeleted}
        />
      ))}

      {showExamForm ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">New exam</h2>
          <form onSubmit={handleAddExam} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Subject</label>
                <input
                  required
                  placeholder="e.g. Linear Algebra"
                  value={examForm.subject}
                  onChange={e => setExamForm(f => ({ ...f, subject: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Exam date</label>
                <input
                  type="date"
                  required
                  min={todayISO()}
                  value={examForm.exam_date}
                  onChange={e => setExamForm(f => ({ ...f, exam_date: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Priority (1 = low)</label>
                <input
                  type="number" min={1} max={10} required
                  value={examForm.priority}
                  onChange={e => setExamForm(f => ({ ...f, priority: Number(e.target.value) }))}
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Revision days before exam</label>
                <input
                  type="number" min={0} max={14} required
                  value={examForm.revision_days}
                  onChange={e => setExamForm(f => ({ ...f, revision_days: Number(e.target.value) }))}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-gray-400">
                  These days are blocked from new material — reserved for review only.
                </p>
              </div>
            </div>

            {examError && <p className="text-xs text-red-600">{examError}</p>}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={examSaving} className={btnPrimary}>
                {examSaving ? 'Saving…' : 'Add exam'}
              </button>
              <button type="button" onClick={() => { setShowExamForm(false); setExamError(null) }} className={btnGhost}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowExamForm(true)}
          className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition"
        >
          <PlusCircle size={16} />
          Add exam
        </button>
      )}
    </div>
  )
}

// ─── ExamCard ─────────────────────────────────────────────────────────────────

interface ExamCardProps {
  exam: Exam
  materials: StudyMaterial[]
  sessions: StudySession[]
  onDeleteExam: (id: string) => void
  onMaterialAdded: (m: StudyMaterial) => void
  onMaterialDeleted: (id: string) => void
}

function ExamCard({ exam, materials, sessions, onDeleteExam, onMaterialAdded, onMaterialDeleted }: ExamCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', type: 'book' as MaterialType, total_units: '', unit_label: 'page',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const daysUntil = Math.ceil(
    (new Date(exam.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  async function handleAddMaterial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const supabase = getSupabaseClient()
      const payload: StudyMaterialInsert = {
        exam_id: exam.id,
        title: form.title.trim(),
        type: form.type,
        total_units: Number(form.total_units),
        unit_label: form.unit_label.trim() || 'page',
      }
      const created = await createMaterial(supabase, payload)
      onMaterialAdded(created)
      setForm({ title: '', type: 'book', total_units: '', unit_label: 'page' })
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add material')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteMaterial(id: string) {
    if (!confirm('Delete this material?')) return
    try {
      const supabase = getSupabaseClient()
      await deleteMaterial(supabase, id)
      onMaterialDeleted(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete material')
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Exam header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-3 text-left flex-1 min-w-0"
        >
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{exam.subject}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(exam.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}
              {daysUntil > 0 ? `${daysUntil}d away` : daysUntil === 0 ? 'Today!' : 'Past'}
              {' · '}Priority {exam.priority}
              {' · '}{exam.revision_days}d revision
            </p>
          </div>
          <span className="ml-2 shrink-0 text-gray-400">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>
        <button
          onClick={() => onDeleteExam(exam.id)}
          className="ml-3 shrink-0 p-1.5 text-gray-300 hover:text-red-500 transition"
          title="Delete exam"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Materials list */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-3 flex flex-col gap-2">
          {materials.length === 0 && !showForm && (
            <p className="text-xs text-gray-400 py-1">No materials yet.</p>
          )}

          {materials.map(m => {
            const pace = calculatePace(sessions, m.id, 0)
            const hasPace = pace > 0
            return (
              <div key={m.id} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-sm text-gray-800">{m.title}</p>
                  <p className="text-xs text-gray-400">
                    {m.total_units} {m.unit_label}s · {m.type}
                    {hasPace && (
                      <span className="ml-2 text-gray-500 font-medium">
                        · {pace.toFixed(1)} {m.unit_label}s/min
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteMaterial(m.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition"
                  title="Delete material"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}

          {/* Add material form */}
          {showForm ? (
            <form onSubmit={handleAddMaterial} className="flex flex-col gap-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className={labelCls}>Title</label>
                  <input
                    required
                    placeholder="e.g. Lecture slides week 1–6"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as MaterialType }))}
                    className={inputCls}
                  >
                    {MATERIAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Unit label</label>
                  <input
                    placeholder="page, slide, note…"
                    value={form.unit_label}
                    onChange={e => setForm(f => ({ ...f, unit_label: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Total units</label>
                  <input
                    type="number" required min={1} placeholder="e.g. 320"
                    value={form.total_units}
                    onChange={e => setForm(f => ({ ...f, total_units: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} className={btnPrimary}>
                  {saving ? 'Saving…' : 'Add material'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setError(null) }} className={btnGhost}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 mt-1 text-xs text-gray-400 hover:text-gray-700 transition"
            >
              <PlusCircle size={13} />
              Add material
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Style constants ──────────────────────────────────────────────────────────

const labelCls = 'block text-xs font-medium text-gray-600 mb-1'
const inputCls = 'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition'
const btnPrimary = 'rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition'
const btnGhost = 'px-4 py-1.5 text-sm text-gray-400 hover:text-gray-600 transition'

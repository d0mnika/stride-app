'use client'

import React, { useState, useTransition } from 'react'
import { Trash2, PlusCircle, ChevronDown, ChevronUp, Lock, X, Sparkles, RotateCcw, Pencil, CheckCircle } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import {
  createExam, updateExam, deleteExam,
  createMaterial, updateMaterial, deleteMaterial,
  getSummaryByMaterial, createSession,
} from '@/lib/supabase/helpers'
import { calculatePace, calculateRemaining } from '@/lib/scheduler'
import { regenAfterMaterialChange } from './actions'
import type { Exam, ExamInsert, StudyMaterial, StudyMaterialInsert, StudySession, MaterialSummary } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string
  plan: string
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

export default function MaterialsClient({ userId, plan, initialExams, initialMaterials, initialSessions }: Props) {
  const [exams, setExams] = useState<Exam[]>(initialExams)
  const [materials, setMaterials] = useState<StudyMaterial[]>(initialMaterials)
  const [sessions] = useState<StudySession[]>(initialSessions)
  const [showExamForm, setShowExamForm] = useState(false)
  const [showArchivedExams, setShowArchivedExams] = useState(false)
  const [summaryModal, setSummaryModal] = useState<{ material: StudyMaterial } | null>(null)
  const [, startRegen] = useTransition()

  const [examForm, setExamForm] = useState({
    subject: '', exam_date: '', priority: 1, revision_days: 1,
  })
  const [examError, setExamError] = useState<string | null>(null)
  const [examSaving, setExamSaving] = useState(false)

  const isPro = plan === 'pro'

  function isExamCompleted(exam: Exam) {
    const examMaterials = materials.filter(m => m.exam_id === exam.id)
    return examMaterials.length > 0 && examMaterials.every(m => calculateRemaining(m, sessions) <= 0)
  }

  function isExamPast(exam: Exam) {
    return exam.exam_date < todayISO()
  }

  function isExamArchived(exam: Exam) {
    return !exam.keep_active && (isExamCompleted(exam) || isExamPast(exam))
  }

  const activeExams = exams.filter(e => !isExamArchived(e))
  const archivedExams = exams.filter(isExamArchived)
  const atExamLimit = !isPro && activeExams.length >= 1

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
        // Free users always get defaults regardless of field values
        priority: isPro ? examForm.priority : 1,
        revision_days: isPro ? examForm.revision_days : 1,
      }
      const created = await createExam(supabase, payload)
      setExams(prev => [...prev, created].sort((a, b) => a.exam_date.localeCompare(b.exam_date)))
      setExamForm({ subject: '', exam_date: '', priority: 1, revision_days: 1 })
      setShowExamForm(false)
      startRegen(async () => { await regenAfterMaterialChange() })
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

  function handleExamUpdated(updated: Exam) {
    setExams(prev => prev.map(e => e.id === updated.id ? updated : e))
  }

  async function handleRestoreExam(examId: string) {
    try {
      const supabase = getSupabaseClient()
      const updated = await updateExam(supabase, examId, { keep_active: true })
      handleExamUpdated(updated)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to restore exam')
    }
  }

  function handleMaterialAdded(material: StudyMaterial) {
    setMaterials(prev => [...prev, material])
    startRegen(() => { regenAfterMaterialChange() })
  }

  function handleMaterialUpdated(material: StudyMaterial) {
    setMaterials(prev => prev.map(m => m.id === material.id ? material : m))
  }

  function handleMaterialDeleted(materialId: string) {
    setMaterials(prev => prev.filter(m => m.id !== materialId))
  }

  return (
    <div className="flex flex-col gap-4">
      {exams.length === 0 && !showExamForm && (
        <p className="text-sm text-[#A38F86] text-center py-8">No exams yet. Add your first one below.</p>
      )}

      {activeExams.map(exam => (
        <ExamCard
          key={exam.id}
          exam={exam}
          plan={plan}
          materials={materials.filter(m => m.exam_id === exam.id)}
          sessions={sessions}
          onDeleteExam={handleDeleteExam}
          onExamUpdated={handleExamUpdated}
          onMaterialAdded={handleMaterialAdded}
          onMaterialUpdated={handleMaterialUpdated}
          onMaterialDeleted={handleMaterialDeleted}
          onSummaryClick={m => setSummaryModal({ material: m })}
        />
      ))}

      {archivedExams.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchivedExams(v => !v)}
            className="w-full flex items-center justify-center gap-2 text-xs text-[#A38F86] hover:text-[#5C4A45] transition py-2"
          >
            <CheckCircle size={13} className="text-[#7BA87B]" />
            {showArchivedExams ? 'Hide' : 'Show'} archived ({archivedExams.length})
          </button>
          {showArchivedExams && archivedExams.map(exam => (
            <ExamCard
              key={exam.id}
              exam={exam}
              plan={plan}
              materials={materials.filter(m => m.exam_id === exam.id)}
              sessions={sessions}
              isArchived
              isCompleted={isExamCompleted(exam)}
              onDeleteExam={handleDeleteExam}
              onRestoreExam={handleRestoreExam}
              onExamUpdated={handleExamUpdated}
              onMaterialAdded={handleMaterialAdded}
              onMaterialUpdated={handleMaterialUpdated}
              onMaterialDeleted={handleMaterialDeleted}
              onSummaryClick={m => setSummaryModal({ material: m })}
            />
          ))}
        </div>
      )}

      {summaryModal && (
        <SummaryModal
          material={summaryModal.material}
          userId={userId}
          onClose={() => setSummaryModal(null)}
        />
      )}

      {/* Add exam form */}
      {showExamForm ? (
        <div className="rounded-xl border border-[#EDEAE3] bg-[#FAF9F7] p-5 shadow-[0_2px_8px_rgba(163,143,134,0.1)]">
          <h2 className="text-sm font-semibold text-[#5C4A45] mb-4">New exam</h2>
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

              {/* Priority — Pro only */}
              <div className={!isPro ? 'opacity-50' : ''}>
                <label className={labelCls}>
                  Priority (1 = low)
                  {!isPro && <span className="ml-1.5 text-xs font-semibold text-[#A38F86] uppercase tracking-wide">Pro</span>}
                </label>
                <input
                  type="number" min={1} max={10} required
                  disabled={!isPro}
                  value={examForm.priority}
                  onChange={e => setExamForm(f => ({ ...f, priority: Number(e.target.value) }))}
                  className={inputCls}
                />
              </div>

              {/* Revision days — Pro only */}
              <div className={`col-span-2 ${!isPro ? 'opacity-50' : ''}`}>
                <label className={labelCls}>
                  Revision days before exam
                  {!isPro && <span className="ml-1.5 text-xs font-semibold text-[#A38F86] uppercase tracking-wide">Pro</span>}
                </label>
                <input
                  type="number" min={0} max={14} required
                  disabled={!isPro}
                  value={examForm.revision_days}
                  onChange={e => setExamForm(f => ({ ...f, revision_days: Number(e.target.value) }))}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-[#A38F86]">
                  {isPro
                    ? 'These days are blocked from new material — reserved for review only.'
                    : 'Upgrade to Pro to set custom revision days.'}
                </p>
              </div>
            </div>

            {examError && <p className="text-xs text-[#C47070]">{examError}</p>}

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
      ) : atExamLimit ? (
        /* Free tier — exam limit reached */
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#D2C4B5] px-4 py-3 text-sm text-[#A38F86]">
          <Lock size={15} className="shrink-0" />
          <span className="flex-1">1 exam limit on Free plan</span>
          <a href="/account" className="shrink-0 text-xs font-medium text-[#C8A7A1] hover:text-[#B89390] transition">
            Upgrade to Pro →
          </a>
        </div>
      ) : (
        <button
          onClick={() => setShowExamForm(true)}
          className="flex items-center gap-2 rounded-xl border border-dashed border-[#D2C4B5] px-4 py-3 text-sm text-[#8C7B75] hover:border-[#A38F86] hover:text-[#5C4A45] transition"
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
  plan: string
  materials: StudyMaterial[]
  sessions: StudySession[]
  isArchived?: boolean
  isCompleted?: boolean
  onDeleteExam: (id: string) => void
  onRestoreExam?: (id: string) => void
  onExamUpdated: (e: Exam) => void
  onMaterialAdded: (m: StudyMaterial) => void
  onMaterialUpdated: (m: StudyMaterial) => void
  onMaterialDeleted: (id: string) => void
  onSummaryClick: (m: StudyMaterial) => void
}

function ExamCard({ exam, plan, materials, sessions, isArchived, isCompleted, onDeleteExam, onRestoreExam, onExamUpdated, onMaterialAdded, onMaterialUpdated, onMaterialDeleted, onSummaryClick }: ExamCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    subject: exam.subject, exam_date: exam.exam_date,
    priority: exam.priority, revision_days: exam.revision_days,
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '', type: 'book' as MaterialType, total_units: '', unit_label: 'page',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null)
  const [materialEditForm, setMaterialEditForm] = useState({
    title: '', type: 'book' as MaterialType, total_units: '', unit_label: 'page',
  })
  const [materialEditSaving, setMaterialEditSaving] = useState(false)
  const [materialEditError, setMaterialEditError] = useState<string | null>(null)

  const isPro = plan === 'pro'
  const daysUntil = Math.ceil(
    (new Date(exam.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  async function handleEditExam(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEditError(null)
    setEditSaving(true)
    try {
      const supabase = getSupabaseClient()
      const updated = await updateExam(supabase, exam.id, {
        subject: editForm.subject.trim(),
        exam_date: editForm.exam_date,
        priority: isPro ? editForm.priority : exam.priority,
        revision_days: isPro ? editForm.revision_days : exam.revision_days,
      })
      onExamUpdated(updated)
      setEditing(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update exam')
    } finally {
      setEditSaving(false)
    }
  }

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

  function startEditMaterial(m: StudyMaterial) {
    setEditingMaterialId(m.id)
    setMaterialEditForm({
      title: m.title,
      type: m.type as MaterialType,
      total_units: String(m.total_units),
      unit_label: m.unit_label ?? 'page',
    })
    setMaterialEditError(null)
  }

  async function handleSaveMaterial(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    setMaterialEditSaving(true)
    setMaterialEditError(null)
    try {
      const supabase = getSupabaseClient()
      const updated = await updateMaterial(supabase, id, {
        title: materialEditForm.title.trim(),
        type: materialEditForm.type,
        total_units: Number(materialEditForm.total_units),
        unit_label: materialEditForm.unit_label.trim() || 'page',
      })
      onMaterialUpdated(updated)
      setEditingMaterialId(null)
    } catch (err) {
      setMaterialEditError(err instanceof Error ? err.message : 'Failed to update material')
    } finally {
      setMaterialEditSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-[#EDEAE3] bg-[#FAF9F7] overflow-hidden shadow-[0_2px_8px_rgba(163,143,134,0.1)]">
      {/* Exam header */}
      {editing ? (
        <div className="px-5 py-4">
          <form onSubmit={handleEditExam} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className={labelCls}>Subject</label>
                <input required value={editForm.subject}
                  onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Exam date</label>
                <input type="date" required min={todayISO()} value={editForm.exam_date}
                  onChange={e => setEditForm(f => ({ ...f, exam_date: e.target.value }))}
                  className={inputCls} />
              </div>
              <div className={!isPro ? 'opacity-50' : ''}>
                <label className={labelCls}>Priority (1 = low){!isPro && <span className="ml-1.5 text-xs font-semibold text-[#A38F86] uppercase">Pro</span>}</label>
                <input type="number" min={1} max={10} required disabled={!isPro}
                  value={editForm.priority}
                  onChange={e => setEditForm(f => ({ ...f, priority: Number(e.target.value) }))}
                  className={inputCls} />
              </div>
              <div className={`col-span-2 ${!isPro ? 'opacity-50' : ''}`}>
                <label className={labelCls}>Revision days{!isPro && <span className="ml-1.5 text-xs font-semibold text-[#A38F86] uppercase">Pro</span>}</label>
                <input type="number" min={0} max={14} required disabled={!isPro}
                  value={editForm.revision_days}
                  onChange={e => setEditForm(f => ({ ...f, revision_days: Number(e.target.value) }))}
                  className={inputCls} />
              </div>
            </div>
            {editError && <p className="text-xs text-[#C47070]">{editError}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={editSaving} className={btnPrimary}>
                {editSaving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => { setEditing(false); setEditError(null) }} className={btnGhost}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex items-center justify-between px-5 py-4">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-3 text-left flex-1 min-w-0"
          >
            <div className="min-w-0">
              <p className="font-semibold text-[#3D2B26] truncate">
                {exam.subject}
                {isArchived && (
                  <span className={`ml-2 text-[10px] font-medium uppercase tracking-wide rounded-full px-1.5 py-0.5 ${
                    isCompleted ? 'bg-[#E3EBDF] text-[#5E7A56]' : 'bg-[#F0E4D6] text-[#9C7E63]'
                  }`}>
                    {isCompleted ? 'Completed' : 'Incomplete'}
                  </span>
                )}
              </p>
              <p className="text-xs text-[#A38F86] mt-0.5">
                {new Date(exam.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' · '}
                {daysUntil > 0 ? `${daysUntil}d away` : daysUntil === 0 ? 'Today!' : 'Past'}
                {' · '}Priority {exam.priority}
                {' · '}{exam.revision_days}d revision
              </p>
            </div>
            <span className="ml-2 shrink-0 text-[#A38F86]">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>
          {isArchived && onRestoreExam && (
            <button
              onClick={() => onRestoreExam(exam.id)}
              className="ml-2 shrink-0 p-1.5 text-[#C4B3AC] hover:text-[#5C4A45] transition"
              title="Restore to active"
            >
              <RotateCcw size={14} />
            </button>
          )}
          {!isArchived && (
            <button
              onClick={() => { setEditForm({ subject: exam.subject, exam_date: exam.exam_date, priority: exam.priority, revision_days: exam.revision_days }); setEditing(true) }}
              className="ml-2 shrink-0 p-1.5 text-[#C4B3AC] hover:text-[#5C4A45] transition"
              title="Edit exam"
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            onClick={() => onDeleteExam(exam.id)}
            className="shrink-0 p-1.5 text-[#C4B3AC] hover:text-[#C47070] transition"
            title="Delete exam"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}

      {/* Materials list */}
      {expanded && (
        <div className="border-t border-[#EDEAE3] px-5 py-3 flex flex-col gap-2">
          {materials.length === 0 && !showForm && (
            <p className="text-xs text-[#A38F86] py-1">No materials yet.</p>
          )}

          {materials.map(m => {
            const pace = calculatePace(sessions, m.id, 0)
            const hasPace = pace > 0

            if (editingMaterialId === m.id) {
              return (
                <form key={m.id} onSubmit={e => handleSaveMaterial(e, m.id)} className="flex flex-col gap-2 py-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className={labelCls}>Title</label>
                      <input required value={materialEditForm.title}
                        onChange={e => setMaterialEditForm(f => ({ ...f, title: e.target.value }))}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Type</label>
                      <select value={materialEditForm.type}
                        onChange={e => setMaterialEditForm(f => ({ ...f, type: e.target.value as MaterialType }))}
                        className={inputCls}>
                        {MATERIAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Unit label</label>
                      <input value={materialEditForm.unit_label}
                        onChange={e => setMaterialEditForm(f => ({ ...f, unit_label: e.target.value }))}
                        className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Total units</label>
                      <input type="number" required min={1} value={materialEditForm.total_units}
                        onChange={e => setMaterialEditForm(f => ({ ...f, total_units: e.target.value }))}
                        className={inputCls} />
                    </div>
                  </div>
                  {materialEditError && <p className="text-xs text-[#C47070]">{materialEditError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={materialEditSaving} className={btnPrimary}>
                      {materialEditSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" onClick={() => { setEditingMaterialId(null); setMaterialEditError(null) }} className={btnGhost}>
                      Cancel
                    </button>
                  </div>
                </form>
              )
            }

            return (
              <div key={m.id} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-sm text-[#3D2B26]">{m.title}</p>
                  <p className="text-xs text-[#A38F86]">
                    {m.total_units} {m.unit_label}s · {m.type}
                    {hasPace && (
                      <span className="ml-2 text-[#8C7B75] font-medium">
                        · {pace.toFixed(1)} {m.unit_label}s/min
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {/* AI Summary — Pro only */}
                  {plan !== 'pro' ? (
                    <span className="flex items-center gap-1 rounded-md border border-[#EDEAE3] px-2 py-1 text-xs text-[#C4B3AC] select-none" title="AI Summary — Pro feature">
                      <Lock size={11} />
                      AI Summary
                    </span>
                  ) : (
                    <button
                      onClick={() => onSummaryClick(m)}
                      className="flex items-center gap-1 rounded-md border border-[#EDEAE3] px-2 py-1 text-xs text-[#8C7B75] hover:border-[#A38F86] hover:text-[#5C4A45] transition"
                    >
                      <Sparkles size={11} />
                      AI Summary
                    </button>
                  )}
                  <button
                    onClick={() => startEditMaterial(m)}
                    className="p-1.5 text-[#C4B3AC] hover:text-[#5C4A45] transition"
                    title="Edit material"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteMaterial(m.id)}
                    className="p-1.5 text-[#C4B3AC] hover:text-[#C47070] transition"
                    title="Delete material"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
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

              {error && <p className="text-xs text-[#C47070]">{error}</p>}

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
              className="flex items-center gap-1.5 mt-1 text-xs text-[#A38F86] hover:text-[#5C4A45] transition"
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

// ─── Summary Content renderer ────────────────────────────────────────────────

function SummaryContent({ text }: { text: string }) {
  const nodes: React.ReactNode[] = []
  let listItems: string[] = []

  function flushList() {
    if (listItems.length > 0) {
      nodes.push(
        <ul key={`ul-${nodes.length}`} className="list-disc list-outside ml-4 space-y-0.5">
          {listItems.map((item, i) => <li key={i} className="text-sm text-[#3D2B26]">{item}</li>)}
        </ul>
      )
      listItems = []
    }
  }

  for (const line of text.split('\n')) {
    const t = line.trim()
    if (t.startsWith('## ')) {
      flushList()
      nodes.push(<h3 key={`h-${nodes.length}`} className="text-sm font-semibold text-[#3D2B26] mt-3 first:mt-0">{t.slice(3)}</h3>)
    } else if (t.startsWith('- ') || t.startsWith('* ')) {
      listItems.push(t.slice(2))
    } else if (t === '') {
      flushList()
    } else {
      flushList()
      nodes.push(<p key={`p-${nodes.length}`} className="text-sm text-[#3D2B26] leading-relaxed">{t}</p>)
    }
  }
  flushList()

  return <div className="flex flex-col gap-1.5">{nodes}</div>
}

// ─── Summary Modal ────────────────────────────────────────────────────────────

interface SummaryModalProps {
  material: StudyMaterial
  userId: string
  onClose: () => void
}

const CHUNK_SIZE = 4000   // chars per API call — stays within Groq free TPM
const MAX_CHARS = 80000  // ~20 pages of text

function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text]
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length)
    if (end < text.length) {
      const para = text.lastIndexOf('\n\n', end)
      const sent = text.lastIndexOf('. ', end)
      if (para > start + CHUNK_SIZE * 0.5) end = para + 2
      else if (sent > start + CHUNK_SIZE * 0.5) end = sent + 2
    }
    const chunk = text.slice(start, end).trim()
    if (chunk.length >= 20) chunks.push(chunk)
    start = end
  }
  return chunks
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

type Progress =
  | null
  | { phase: 'extracting' }
  | { phase: 'summarizing'; current: number; total: number; waiting?: boolean }
  | { phase: 'saving' }

const SUMMARY_LANGUAGES = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'Polish', label: 'Polish' },
  { value: 'English', label: 'English' },
  { value: 'German', label: 'German' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'Italian', label: 'Italian' },
]

function SummaryModal({ material, userId, onClose }: SummaryModalProps) {
  const supabase = getSupabaseClient()
  const [text, setText] = useState('')
  const [language, setLanguage] = useState('auto')
  const [existing, setExisting] = useState<MaterialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<Progress>(null)
  const [error, setError] = useState<string | null>(null)
  const [logUnits, setLogUnits] = useState('')
  const [logSaving, setLogSaving] = useState(false)
  const [logSuccess, setLogSuccess] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const isWorking = progress !== null

  // Load existing summary on mount
  React.useEffect(() => {
    getSummaryByMaterial(supabase, material.id)
      .then(s => setExisting(s))
      .catch(() => null)
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material.id])

  // ── Core orchestration: splits text into chunks, calls API sequentially ───────
  async function runGenerate(inputText: string, sourceName = 'Pasted text') {
    setError(null)
    const trimmed = inputText.trim()
    if (trimmed.length < 20) {
      setError('Please paste at least a sentence of text to summarise.')
      setProgress(null)
      return
    }
    if (trimmed.length > MAX_CHARS) {
      setError(`Text is too long — max ${MAX_CHARS.toLocaleString()} characters (~20 pages).`)
      setProgress(null)
      return
    }

    const chunks = splitIntoChunks(trimmed)
    const summaries: string[] = []

    try {
      // Summarize each chunk sequentially
      for (let i = 0; i < chunks.length; i++) {
        setProgress({ phase: 'summarizing', current: i + 1, total: chunks.length })

        // Retry loop for rate-limit handling
        while (true) {
          const res = await fetch('/api/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'chunk', text: chunks[i], language }),
          })

          if (res.status === 429) {
            const json = await res.json()
            const waitMs = ((json.retryAfter ?? 60) + 2) * 1000
            setProgress({ phase: 'summarizing', current: i + 1, total: chunks.length, waiting: true })
            await sleep(waitMs)
            setProgress({ phase: 'summarizing', current: i + 1, total: chunks.length })
            continue
          }

          const json = await res.json()
          if (!res.ok) throw new Error(json.error ?? 'AI error')
          summaries.push(json.summary)
          break
        }
      }

      // Combine chunk summaries into one note (no Part labels — AI produces ## headings)
      const body = summaries.join('\n\n')
      const combined = `## ${sourceName}\n\n${body}`

      // Save to DB (appends as a new source block separated by ---)
      setProgress({ phase: 'saving' })
      const saveRes = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'save', materialId: material.id, preGenerated: combined, language }),
      })
      const saveJson = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveJson.error ?? 'Failed to save')

      setExisting(prev => ({ ...prev!, summary: saveJson.summary, model_used: 'llama-3.3-70b' } as MaterialSummary))
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setProgress(null)
    }
  }

  // ── PDF upload handler ────────────────────────────────────────────────────────
  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // reset so same file can be re-selected immediately

    if (file.size > 20 * 1024 * 1024) {
      setError('PDF is too large — maximum 20 MB. Please try a smaller file.')
      return
    }

    setError(null)
    setProgress({ phase: 'extracting' })

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to read PDF')
      const sourceName = file.name.replace(/\.pdf$/i, '')
      await runGenerate(json.text, sourceName)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process PDF.')
      setProgress(null)
    }
  }

  // ── Progress label ────────────────────────────────────────────────────────────
  function progressLabel(): string {
    if (!progress) return ''
    if (progress.phase === 'extracting') return 'Reading PDF…'
    if (progress.phase === 'saving') return 'Saving summary…'
    if (progress.phase === 'summarizing') {
      const { current, total, waiting } = progress
      if (waiting) return `Rate limit reached — waiting to resume (part ${current} of ${total})…`
      return total === 1 ? 'Summarising…' : `Summarising part ${current} of ${total}…`
    }
    return ''
  }

  // ── Log progress from summary ─────────────────────────────────────────────────
  async function handleLogProgress() {
    const units = parseInt(logUnits, 10)
    if (isNaN(units) || units <= 0) return
    setLogSaving(true)
    try {
      await createSession(supabase, {
        material_id: material.id,
        user_id: userId,
        units_completed: units,
        time_spent_sec: 0,
        session_date: new Date().toISOString().slice(0, 10),
      })
      setLogUnits('')
      setLogSuccess(true)
      setTimeout(() => setLogSuccess(false), 3000)
    } catch {
      // silently ignore — non-critical
    } finally {
      setLogSaving(false)
    }
  }

  // ── Shared input panel (used for both first-time and append) ──────────────────
  function InputPanel({ isAppend }: { isAppend: boolean }) {
    return (
      <div className="flex flex-col gap-3">
        {isAppend && (
          <p className="text-xs text-[#8C7B75]">
            Paste the next section — its summary will be appended below the existing one.
          </p>
        )}

        {/* Text input row */}
        <div className="flex flex-col gap-1">
          <textarea
            rows={isAppend ? 5 : 8}
            placeholder={isAppend ? 'Paste the next section of text…' : 'Paste your study text here…'}
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={isWorking}
            className="w-full rounded-lg border border-[#EDEAE3] bg-[#FAF9F7] px-3 py-2 text-sm text-[#3D2B26] outline-none focus:border-[#C8A7A1] focus:ring-1 focus:ring-[#C8A7A1] resize-none disabled:bg-[#F5F1EB] disabled:text-[#A38F86]"
          />
          <p className={`text-xs text-right ${text.length > MAX_CHARS ? 'text-[#C47070]' : 'text-[#A38F86]'}`}>
            {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars (~{Math.ceil(text.length / 4000)} chunk{Math.ceil(text.length / 4000) !== 1 ? 's' : ''})
          </p>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#8C7B75] shrink-0">Summary language</label>
          <select
            value={language}
            disabled={isWorking}
            onChange={e => setLanguage(e.target.value)}
            className="flex-1 rounded-lg border border-[#EDEAE3] bg-[#FAF9F7] px-2 py-1.5 text-sm text-[#3D2B26] outline-none focus:border-[#C8A7A1] disabled:bg-[#F5F1EB] disabled:text-[#A38F86]"
          >
            {SUMMARY_LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>

        {/* Error */}
        {error && <p className="text-xs text-[#C47070]">{error}</p>}

        {/* Progress */}
        {isWorking && (
          <p className="text-xs text-[#8C7B75] animate-pulse">{progressLabel()}</p>
        )}

        {/* Action buttons */}
        {!isWorking && (
          <div className="flex gap-2">
            <button
              onClick={() => runGenerate(text)}
              disabled={text.trim().length < 20}
              className={btnPrimary + ' flex-1'}
            >
              {isAppend ? 'Append to summary' : 'Generate summary'}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-[#EDEAE3] px-3 py-1.5 text-sm text-[#6E5850] hover:border-[#A38F86] hover:text-[#3D2B26] transition"
              title="Upload a PDF instead"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              PDF
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={isWorking ? undefined : onClose}>
      <div
        className="relative w-full max-w-lg rounded-2xl bg-[#FAF9F7] shadow-[0_20px_60px_rgba(163,143,134,0.25)] flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDEAE3]">
          <div>
            <p className="font-semibold text-[#3D2B26] text-sm flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#8C7B75]" />
              AI Summary
            </p>
            <p className="text-xs text-[#A38F86] mt-0.5 truncate max-w-xs">{material.title}</p>
          </div>
          <button onClick={onClose} disabled={isWorking} className="p-1.5 text-[#A38F86] hover:text-[#5C4A45] disabled:opacity-30 transition">
            <X size={16} />
          </button>
        </div>

        {/* Hidden PDF file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handlePdfUpload}
        />

        <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-[#A38F86] text-center py-6">Loading…</p>
          ) : existing?.summary ? (
            <>
              {/* Existing summary — split by source blocks */}
              {existing.summary.split('\n\n---\n\n').map((block, idx) => {
                const firstNl = block.indexOf('\n')
                const firstLine = firstNl === -1 ? block.trim() : block.slice(0, firstNl).trim()
                const sourceTitle = firstLine.startsWith('## ') ? firstLine.slice(3) : null
                const bodyText = sourceTitle
                  ? (firstNl === -1 ? '' : block.slice(firstNl + 1).trim())
                  : block.trim()
                return (
                  <div key={idx} className="rounded-xl bg-[#F5F1EB] border border-[#EDEAE3] px-4 py-3">
                    {sourceTitle && (
                      <p className="text-xs font-medium text-[#A38F86] mb-2 uppercase tracking-wide">
                        {sourceTitle}
                      </p>
                    )}
                    <SummaryContent text={bodyText} />
                  </div>
                )
              })}

              {/* Log progress from this summary */}
              <div className="rounded-xl border border-[#EDEAE3] bg-[#F5F1EB] px-4 py-3 flex flex-col gap-2">
                <p className="text-xs font-medium text-[#5C4A45]">Log progress from this summary</p>
                <p className="text-xs text-[#A38F86]">
                  How many {material.unit_label}s does this summary cover? Logging this reduces your remaining study load.
                </p>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 40"
                    value={logUnits}
                    onChange={e => setLogUnits(e.target.value)}
                    disabled={logSaving}
                    className={inputCls + ' w-24 text-center'}
                  />
                  <span className="text-xs text-[#8C7B75]">{material.unit_label}s</span>
                  <button
                    onClick={handleLogProgress}
                    disabled={logSaving || logUnits === ''}
                    className={btnPrimary}
                  >
                    {logSaving ? 'Saving…' : 'Log progress'}
                  </button>
                  {logSuccess && <span className="text-xs text-green-600">Logged!</span>}
                </div>
              </div>

              {/* Add more */}
              <details className="group">
                <summary className="text-xs text-[#A38F86] cursor-pointer hover:text-[#6E5850] flex items-center gap-1.5">
                  <RotateCcw size={11} />
                  Add another section
                </summary>
                <div className="mt-3">
                  <InputPanel isAppend={true} />
                </div>
              </details>
            </>
          ) : (
            <>
              <p className="text-sm text-[#6E5850]">
                Paste text or upload a PDF — any length, any number of pages. Large documents are split and processed automatically.
              </p>
              <InputPanel isAppend={false} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Style constants ──────────────────────────────────────────────────────────

const labelCls = 'block text-xs font-medium text-[#6E5850] mb-1'
const inputCls = 'w-full rounded-lg border border-[#EDEAE3] bg-[#FAF9F7] px-3 py-1.5 text-sm text-[#3D2B26] outline-none focus:border-[#C8A7A1] focus:ring-1 focus:ring-[#C8A7A1] transition disabled:bg-[#F5F1EB] disabled:text-[#A38F86] disabled:cursor-not-allowed placeholder:text-[#C4B3AC]'
const btnPrimary = 'rounded-lg bg-[#C8A7A1] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#B89390] disabled:opacity-50 transition shadow-[0_4px_12px_rgba(200,167,161,0.25)] hover:shadow-[0_6px_16px_rgba(200,167,161,0.35)]'
const btnGhost = 'px-4 py-1.5 text-sm text-[#A38F86] hover:text-[#5C4A45] transition'

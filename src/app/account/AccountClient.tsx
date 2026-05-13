'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'
import { deleteAccountAction } from './actions'
import { Crown, Check, LogOut, Trash2 } from 'lucide-react'

const PRO_FEATURES = [
  'Crunch mode warnings',
  'Low energy day',
  'Focus mode',
  'AI summaries',
  'Unlimited exams',
  'Exam priority & revision days',
]

interface Props {
  email: string
  name: string | null
  plan: 'free' | 'pro'
  memberSince: string
  hasCustomer: boolean
}

export default function AccountClient({ email, name, plan, memberSince, hasCustomer }: Props) {
  const router  = useRouter()
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading]   = useState(false)

  async function handleSignOut() {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error ?? 'Something went wrong')
    } catch {
      setError('Could not start checkout')
    } finally {
      setLoading(false)
    }
  }

  async function handleManage() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error ?? 'Something went wrong')
    } catch {
      setError('Could not open billing portal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Profile card */}
      <div className="bg-[#FAF9F7] border border-[#EDEAE3] rounded-2xl p-6 shadow-[0_2px_8px_rgba(163,143,134,0.08)]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#C8A7A1] text-white text-xl font-bold flex items-center justify-center shrink-0">
            {email[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            {name && <p className="font-medium text-[#3D2B26] truncate">{name}</p>}
            <p className="text-sm text-[#8C7B75] truncate">{email}</p>
            <p className="text-xs text-[#A38F86] mt-0.5">Member since {memberSince}</p>
          </div>
          <div className="ml-auto shrink-0">
            {plan === 'pro' ? (
              <span className="flex items-center gap-1.5 bg-[#3D2B26] text-[#F5F1EB] text-xs font-semibold px-3 py-1.5 rounded-full">
                <Crown size={11} />
                Pro
              </span>
            ) : (
              <span className="bg-[#EDEAE3] text-[#8C7B75] text-xs font-medium px-3 py-1.5 rounded-full">
                Free
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Subscription card */}
      {plan === 'free' ? (
        <div className="bg-[#FAF9F7] border border-[#EDEAE3] rounded-2xl p-6 shadow-[0_2px_8px_rgba(163,143,134,0.08)]">
          <div className="flex items-start gap-3 mb-5">
            <Crown size={18} className="text-[#C8A7A1] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-palatino text-lg font-bold text-[#3D2B26]">Upgrade to Pro</h2>
              <p className="text-sm text-[#8C7B75] mt-0.5">Unlock everything Stride has to offer.</p>
            </div>
          </div>

          <ul className="space-y-2 mb-6">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-[#5C4A45]">
                <Check size={14} className="text-[#C8A7A1] shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#3D2B26] text-[#F5F1EB] text-sm font-semibold hover:bg-[#5C4A45] transition shadow-[0_4px_12px_rgba(61,43,38,0.2)] disabled:opacity-50"
          >
            {loading ? 'Redirecting…' : 'Upgrade to Pro'}
          </button>
        </div>
      ) : (
        <div className="bg-[#FAF9F7] border border-[#EDEAE3] rounded-2xl p-6 shadow-[0_2px_8px_rgba(163,143,134,0.08)]">
          <div className="flex items-center gap-3 mb-4">
            <Crown size={18} className="text-[#C8A7A1] shrink-0" />
            <h2 className="font-palatino text-lg font-bold text-[#3D2B26]">Pro subscription active</h2>
          </div>
          <p className="text-sm text-[#8C7B75] mb-5">
            You have access to all Pro features. Manage your billing or cancel any time.
          </p>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          {hasCustomer && (
            <button
              onClick={handleManage}
              disabled={loading}
              className="w-full py-3 rounded-xl border border-[#D2C4B5] bg-[#FAF9F7] text-sm font-medium text-[#5C4A45] hover:border-[#A38F86] hover:bg-[#F0ECE6] transition disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Manage subscription'}
            </button>
          )}
        </div>
      )}

      {/* Sign out + Delete account */}
      <div className="bg-[#FAF9F7] border border-[#EDEAE3] rounded-2xl p-6 shadow-[0_2px_8px_rgba(163,143,134,0.08)] flex items-center justify-between">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-[#8C7B75] hover:text-[#3D2B26] transition"
        >
          <LogOut size={14} />
          Sign out
        </button>

        {showDeleteConfirm ? (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#9A5555] font-medium">Delete all data — are you sure?</span>
            <button
              onClick={async () => { setDeleteLoading(true); await deleteAccountAction() }}
              disabled={deleteLoading}
              className="rounded-lg bg-[#C47070] px-3 py-1.5 font-medium text-white hover:bg-[#A85555] disabled:opacity-50 transition"
            >
              {deleteLoading ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="text-[#A38F86] hover:text-[#5C4A45] transition"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 text-xs text-[#C4B3AC] hover:text-[#9A5555] transition"
          >
            <Trash2 size={13} />
            Delete account
          </button>
        )}
      </div>

      {/* Legal */}
      <p className="text-center text-xs text-[#A38F86]">
        <Link href="/privacy" className="hover:text-[#5C4A45] underline transition">Privacy Policy</Link>
        {' · '}
        <Link href="/terms" className="hover:text-[#5C4A45] underline transition">Terms of Service</Link>
      </p>

    </div>
  )
}

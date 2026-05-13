'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { name },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#3D2B26] mb-4">Check your email</h1>
        <p className="text-sm text-[#5C4A45]">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account
          and get started.
        </p>
        <p className="mt-6 text-sm text-[#8C7B75]">
          <Link href="/login" className="font-medium text-[#C8A7A1] hover:text-[#B89390] transition">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#3D2B26]">Stride</h1>
        <p className="mt-2 text-sm text-[#8C7B75]">Create your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[#5C4A45] mb-1">
            Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#5C4A45] mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#5C4A45] mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-[#A38F86]">Minimum 8 characters</p>
        </div>

        {error && (
          <p className="text-sm text-[#C47070] bg-[#FAF0EF] border border-[#E69B97] rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={btnPrimary + ' w-full'}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#8C7B75]">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-[#C8A7A1] hover:text-[#B89390] transition">
          Sign in
        </Link>
      </p>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-[#EDEAE3] bg-[#FAF9F7] px-3 py-2 text-sm text-[#3D2B26] outline-none focus:border-[#C8A7A1] focus:ring-1 focus:ring-[#C8A7A1] transition placeholder:text-[#C4B3AC]'
const btnPrimary = 'rounded-lg bg-[#C8A7A1] px-4 py-2 text-sm font-medium text-white hover:bg-[#B89390] disabled:opacity-50 transition shadow-[0_4px_12px_rgba(200,167,161,0.3)] hover:shadow-[0_6px_16px_rgba(200,167,161,0.4)]'

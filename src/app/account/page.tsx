import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/helpers'
import AppNav from '@/components/AppNav'
import BottomNav from '@/components/BottomNav'
import AccountClient from './AccountClient'

export default async function AccountPage() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const profile = await getProfile(supabase, user.id)

  const memberSince = new Date(user.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <main className="min-h-screen bg-[#F5F1EB]">
      <AppNav current="/account" userInitial={user.email?.[0].toUpperCase()} />
      <div className="max-w-2xl mx-auto px-6 pt-10 pb-24 sm:pb-16">
        <h1 className="font-palatino text-3xl font-bold text-[#3D2B26] mb-8">Account</h1>

        <AccountClient
          email={user.email ?? ''}
          name={profile?.name ?? null}
          plan={profile?.plan ?? 'free'}
          memberSince={memberSince}
          hasCustomer={!!profile?.stripe_customer_id}
        />
      </div>
      <BottomNav current="/account" />
    </main>
  )
}

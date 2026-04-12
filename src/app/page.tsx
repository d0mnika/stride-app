import { redirect } from 'next/navigation'

// Root route — middleware handles auth-based redirection.
// This fallback just ensures / never 404s.
export default function RootPage() {
  redirect('/dashboard')
}

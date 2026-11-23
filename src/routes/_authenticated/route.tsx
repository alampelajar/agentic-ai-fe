import { createFileRoute, redirect } from '@tanstack/react-router'
import { guestRedirect } from '@/lib/guest'
import { ensureSession } from '@/lib/session'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated')({
  // An old access token is renewed with the refresh token first; only a failed renewal signs
  // the person out (before, everyone was sent to sign in again every 15 minutes).
  // A visitor who has not signed in may open every page and look around; using a
  // feature opens the sign-in pop-up (`SignInPrompt`).
  beforeLoad: async ({ location }) => {
    if (await ensureSession()) return
    const elsewhere = guestRedirect(location.pathname)
    if (elsewhere) throw redirect({ to: elsewhere })
  },

  component: AuthenticatedLayout,
})

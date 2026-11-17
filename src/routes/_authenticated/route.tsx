import { createFileRoute, redirect } from '@tanstack/react-router'
import { ensureSession } from '@/lib/session'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated')({
  // An old access token is renewed with the refresh token first; only a failed renewal signs
  // the person out (before, everyone was sent to sign in again every 15 minutes).
  beforeLoad: async ({ location }) => {
    if (!(await ensureSession())) {
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: location.href,
        },
      })
    }
  },

  component: AuthenticatedLayout,
})

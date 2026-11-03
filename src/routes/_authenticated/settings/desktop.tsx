import { createFileRoute, redirect } from '@tanstack/react-router'

// The Desktop Runtime now lives under Settings → Integrations. This keeps old links and bookmarks working.
export const Route = createFileRoute('/_authenticated/settings/desktop')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/integrations', replace: true })
  },
})

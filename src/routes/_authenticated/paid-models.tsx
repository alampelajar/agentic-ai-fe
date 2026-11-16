import { createFileRoute, redirect } from '@tanstack/react-router'

// Keep old bookmarks working: the models pages left the app (WEBSITE-BUILDER.md, section 20).
export const Route = createFileRoute('/_authenticated/paid-models')({
  beforeLoad: () => {
    throw redirect({ to: '/sites' })
  },
})

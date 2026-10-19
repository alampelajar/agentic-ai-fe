import { createFileRoute, redirect } from '@tanstack/react-router'

// Keep old bookmarks working after Free and Paid models are combined under Apps.
export const Route = createFileRoute('/_authenticated/paid-models')({
  beforeLoad: () => {
    throw redirect({ to: '/apps' })
  },
})

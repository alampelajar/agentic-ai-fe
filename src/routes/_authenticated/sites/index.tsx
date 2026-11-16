import { createFileRoute } from '@tanstack/react-router'
import { SitesPage } from '@/features/sites'

export const Route = createFileRoute('/_authenticated/sites/')({
  component: SitesPage,
})

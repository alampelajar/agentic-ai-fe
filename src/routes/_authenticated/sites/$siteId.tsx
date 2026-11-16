import { createFileRoute } from '@tanstack/react-router'
import { SiteBuilderRoute } from '@/features/sites/builder'

export const Route = createFileRoute('/_authenticated/sites/$siteId')({
  component: SiteBuilderRoute,
})

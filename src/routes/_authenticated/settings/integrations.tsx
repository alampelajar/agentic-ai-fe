import { createFileRoute } from '@tanstack/react-router'
import { IntegrationsPage } from '@/features/settings/integrations'

export const Route = createFileRoute('/_authenticated/settings/integrations')({
  component: IntegrationsPage,
})

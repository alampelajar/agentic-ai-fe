import { createFileRoute } from '@tanstack/react-router'
import { DesignProjectsPage } from '@/features/design-studio'

export const Route = createFileRoute('/_authenticated/design-studio/')({
  component: DesignProjectsPage,
})

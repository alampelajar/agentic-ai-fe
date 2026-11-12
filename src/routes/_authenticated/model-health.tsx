import { createFileRoute } from '@tanstack/react-router'
import { ModelHealthPage } from '@/features/model-health'

export const Route = createFileRoute('/_authenticated/model-health')({
  component: ModelHealthPage,
})

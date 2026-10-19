
import { createFileRoute } from '@tanstack/react-router'
import { PaidModels } from '@/features/paid-models'

export const Route = createFileRoute('/_authenticated/paid-models')({
  component: PaidModels,
})

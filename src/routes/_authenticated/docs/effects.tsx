import { createFileRoute } from '@tanstack/react-router'
import { EffectsPage } from '@/features/docs/effects'

export const Route = createFileRoute('/_authenticated/docs/effects')({
  component: EffectsPage,
})

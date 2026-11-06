import { createFileRoute } from '@tanstack/react-router'
import { CombosPage } from '@/features/combos'

export const Route = createFileRoute('/_authenticated/combos')({
  component: CombosPage,
})

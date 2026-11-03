import { createFileRoute } from '@tanstack/react-router'
import { MemoryPage } from '@/features/memory'

export const Route = createFileRoute('/_authenticated/memory')({
  component: MemoryPage,
})

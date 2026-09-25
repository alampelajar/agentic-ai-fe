import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'

import { AIAssistant } from '@/features/ai'

const aiSearchSchema = z.object({
  task: z.coerce.string().optional(),
})

export const Route = createFileRoute('/_authenticated/ai/')({
  validateSearch: aiSearchSchema,
  component: AIAssistant,
})

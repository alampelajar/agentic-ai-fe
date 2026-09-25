import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Agents } from '@/features/agents'

const agentsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),

  status: z
    .array(
      z.union([z.literal('running'), z.literal('idle'), z.literal('offline')])
    )
    .optional()
    .catch([]),

  provider: z
    .array(
      z.union([
        z.literal('OpenAI'),
        z.literal('Anthropic'),
        z.literal('Google'),
        z.literal('DeepSeek'),
      ])
    )
    .optional()
    .catch([]),

  name: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/users/')({
  validateSearch: agentsSearchSchema,
  component: Agents,
})

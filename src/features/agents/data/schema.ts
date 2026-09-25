import { z } from 'zod'

export const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  model: z.string(),
  status: z.enum(['running', 'idle', 'offline', 'training']),
  tasks: z.number(),
  responseTime: z.string(),
  createdAt: z.string(),
})

export type Agent = z.infer<typeof agentSchema>

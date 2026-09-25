import { z } from 'zod'

export const taskSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  title: z.string(),
  description: z.string().optional().default(''),
  status: z.string(),
  label: z.string(),
  priority: z.string(),
  agent_id: z.number().nullable().optional(),
  model_id: z.number().nullable().optional(),
  agent: z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
  }).nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type Task = z.infer<typeof taskSchema>

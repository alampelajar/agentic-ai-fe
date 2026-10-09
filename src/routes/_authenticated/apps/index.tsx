import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Apps } from '@/features/apps'

// ============================================================
// ROUTE SEARCH SCHEMA — AI MODEL HUB
// ============================================================
// filter  : search term (provider / model / capability)
// category: filter type (all | free | free-tier | api | connected)
// ============================================================

const appsSearchSchema = z.object({
  filter: z.string().optional().catch(''),
  category: z
    .enum(['all', 'free', 'free-tier', 'api', 'connected'])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_authenticated/apps/')({
  validateSearch: appsSearchSchema,
  component: Apps,
})

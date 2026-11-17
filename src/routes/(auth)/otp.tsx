import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Otp } from '@/features/auth/otp'

export const Route = createFileRoute('/(auth)/otp')({
  validateSearch: z.object({
    email: z.string().email().optional().catch(undefined),
  }),
  component: Otp,
})

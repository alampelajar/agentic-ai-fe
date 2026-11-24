import { createFileRoute } from '@tanstack/react-router'
import { SubscriptionPremium } from '@/features/subscription'

export const Route = createFileRoute('/_authenticated/subscription-premium')({
  component: SubscriptionPremium,
})

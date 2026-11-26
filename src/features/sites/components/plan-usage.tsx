import { Link } from '@tanstack/react-router'
import { Coins, History, Infinity as Endless, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { canAfford, type Plan } from '../data/api'

/** True when the person may not start a new website now. */
export function planBlocksNewSite(plan: Plan | null): boolean {
  if (!plan) return false
  return (
    plan.sites_used >= plan.site_limit || !canAfford(plan, plan.create_cost)
  )
}

/** The credits: how many are left, what a website and a change use, and a top-up. */
export function PlanUsage({ plan }: { plan: Plan }) {
  const { t } = useTranslation()
  const low = !plan.unlimited && plan.available < plan.create_cost

  return (
    <div className='flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex items-start gap-3'>
        <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
          {plan.unlimited ? (
            <Endless className='size-4' />
          ) : (
            <Coins className='size-4' />
          )}
        </span>
        <div className='space-y-1'>
          <h2 className='text-base font-semibold'>
            {plan.unlimited
              ? t('siteBuilder.credits.unlimited')
              : t('siteBuilder.credits.balance', { count: plan.credits })}
          </h2>
          <p className='text-xs text-muted-foreground'>
            {t('siteBuilder.credits.costs', {
              create: plan.create_cost,
              revise: plan.revise_cost,
            })}
          </p>
          {low ? (
            <p
              role='status'
              className='text-xs text-amber-700 dark:text-amber-400'
            >
              {t('siteBuilder.credits.low')}
            </p>
          ) : null}
        </div>
      </div>
      <Button
        asChild
        variant={low ? 'default' : 'outline'}
        size='sm'
        className='self-start sm:self-auto'
      >
        <Link to='/credits'>
          {plan.unlimited ? (
            <History className='size-4' />
          ) : (
            <Plus className='size-4' />
          )}
          {plan.unlimited
            ? t('siteBuilder.credits.history')
            : t('siteBuilder.credits.add')}
        </Link>
      </Button>
    </div>
  )
}

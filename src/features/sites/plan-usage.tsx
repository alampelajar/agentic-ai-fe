import { Crown, Gauge } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { Plan } from './data/api'

/** True when the person may not start a new website now. */
export function planBlocksNewSite(plan: Plan | null): boolean {
  if (!plan) return false
  return (
    plan.sites_used >= plan.site_limit ||
    (plan.token_limit > 0 && plan.tokens_used >= plan.token_limit)
  )
}

/** How much of the plan is used: websites and this month's AI allowance. */
export function PlanUsage({ plan }: { plan: Plan }) {
  const { t, i18n } = useTranslation()

  const percent =
    plan.token_limit > 0
      ? Math.min(100, Math.round((plan.tokens_used / plan.token_limit) * 100))
      : 0
  const outOfTokens = percent >= 100
  const dateText = (value: string, year = false) =>
    new Date(value).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'long',
      ...(year ? { year: 'numeric' } : {}),
    })

  return (
    <div className='space-y-3 rounded-lg border p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <Gauge className='size-4 text-muted-foreground' />
          <h2 className='text-base font-semibold'>
            {plan.premium
              ? t('siteBuilder.plan.titlePremium')
              : t('siteBuilder.plan.title')}
          </h2>
        </div>
        {plan.premium ? (
          <p className='inline-flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600 dark:text-emerald-400'>
            <Crown className='size-4' />
            {plan.premium_until
              ? t('siteBuilder.plan.premiumUntil', {
                  date: dateText(plan.premium_until, true),
                })
              : t('siteBuilder.plan.premium')}
          </p>
        ) : null}
      </div>
      <dl className='grid gap-3 text-sm sm:grid-cols-2'>
        <div>
          <dt className='text-xs text-muted-foreground'>
            {t('siteBuilder.plan.sites')}
          </dt>
          <dd className='font-medium'>
            {t('siteBuilder.plan.sitesValue', {
              used: plan.sites_used,
              limit: plan.site_limit,
            })}
          </dd>
        </div>
        <div>
          <dt className='text-xs text-muted-foreground'>
            {t('siteBuilder.plan.allowance')}
          </dt>
          <dd className='font-medium'>
            {t('siteBuilder.plan.allowanceValue', { percent })}
          </dd>
          <div
            className='mt-2 h-2 overflow-hidden rounded-full bg-muted'
            role='progressbar'
            aria-label={t('siteBuilder.plan.allowance')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div
              className={cn(
                'h-full rounded-full transition-colors',
                outOfTokens ? 'bg-destructive' : 'bg-primary'
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </dl>
      <p className='text-xs text-muted-foreground'>
        {t('siteBuilder.plan.resets', { date: dateText(plan.resets_at) })}
      </p>
    </div>
  )
}

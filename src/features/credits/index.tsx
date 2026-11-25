import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  Clock,
  Coins,
  History,
  Infinity as Endless,
  Loader2,
  XCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isSignedIn } from '@/lib/guest'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import {
  getCredits,
  type CreditEntry,
  type Plan,
} from '@/features/sites/data/api'
import { siteErrorText } from '@/features/sites/lib/errors'
import { rupiah, TopUp } from './components/top-up'
import {
  getTopUp,
  type Discount,
  type TopUp as TopUpSettings,
  type TopUpRequest,
} from './data/api'

type Loaded =
  | { state: 'loading' }
  | { state: 'guest' }
  | { state: 'error'; text: string }
  | {
      state: 'ready'
      plan: Plan
      history: CreditEntry[]
      welcome: number
      topup: TopUpSettings
      requests: TopUpRequest[]
      discount: Discount
    }

// What one website and one change use, shown to visitors who have no account yet.
const GUEST_COSTS = { create: 2, revise: 1, welcome: 10 }

/** Credits: the balance, buying more by hand, the requests and where credits went. */
export function CreditsPage() {
  const { t, i18n } = useTranslation()
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })

  const load = useCallback(() => {
    if (!isSignedIn()) {
      setLoaded({ state: 'guest' })
      return
    }
    Promise.all([getCredits(), getTopUp()])
      .then(([credits, topup]) =>
        setLoaded({ state: 'ready', ...credits, ...topup })
      )
      .catch((error: unknown) =>
        setLoaded({ state: 'error', text: siteErrorText(t, error) })
      )
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const when = (at: string) =>
    new Date(at).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  const ready = loaded.state === 'ready' ? loaded : null
  const plan = ready?.plan ?? null
  const costs = plan
    ? { create: plan.create_cost, revise: plan.revise_cost }
    : GUEST_COSTS
  const welcome = ready?.welcome ?? GUEST_COSTS.welcome

  return (
    <Main className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>
          {t('creditsPage.title')}
        </h1>
        <p className='text-sm text-muted-foreground'>
          {t('creditsPage.subtitle')}
        </p>
      </div>

      {loaded.state === 'loading' ? (
        <p className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Loader2 className='size-4 animate-spin' />
          {t('creditsPage.loading')}
        </p>
      ) : loaded.state === 'error' ? (
        <div role='alert' className='space-y-3 rounded-lg border p-4'>
          <p className='text-sm font-medium'>{t('creditsPage.error')}</p>
          <p className='text-sm text-muted-foreground'>{loaded.text}</p>
          <Button variant='outline' size='sm' onClick={load}>
            {t('creditsPage.retry')}
          </Button>
        </div>
      ) : (
        <>
          <div className='grid items-start gap-4 lg:grid-cols-2'>
            {/* The balance and what work costs. */}
            <section className='space-y-3 rounded-xl border bg-card p-5'>
              <div className='flex items-center gap-3'>
                <span className='flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary'>
                  {plan?.unlimited ? (
                    <Endless className='size-4' />
                  ) : (
                    <Coins className='size-4' />
                  )}
                </span>
                <div>
                  <p className='text-xs text-muted-foreground'>
                    {t('creditsPage.balanceLabel')}
                  </p>
                  <p className='text-2xl font-semibold'>
                    {plan
                      ? plan.unlimited
                        ? t('siteBuilder.credits.unlimited')
                        : t('siteBuilder.credits.balance', {
                            count: plan.credits,
                          })
                      : t('creditsPage.guestBalance', { count: welcome })}
                  </p>
                </div>
              </div>
              <ul className='space-y-1 text-sm'>
                <li className='flex justify-between gap-4'>
                  <span className='text-muted-foreground'>
                    {t('creditsPage.newWebsite')}
                  </span>
                  <span className='font-medium'>
                    {t('siteBuilder.credits.balance', { count: costs.create })}
                  </span>
                </li>
                <li className='flex justify-between gap-4'>
                  <span className='text-muted-foreground'>
                    {t('creditsPage.change')}
                  </span>
                  <span className='font-medium'>
                    {t('siteBuilder.credits.balance', { count: costs.revise })}
                  </span>
                </li>
              </ul>
              <p className='text-xs text-muted-foreground'>
                {t('creditsPage.onlyWhenDone')}
              </p>
            </section>

            {plan?.unlimited ? null : (
              <TopUp
                topup={ready?.topup ?? null}
                discount={ready?.discount ?? null}
                onSent={load}
              />
            )}
          </div>

          {/* Top-up requests and what became of them. */}
          {ready && ready.requests.length > 0 ? (
            <section className='space-y-3'>
              <h2 className='text-base font-semibold'>
                {t('creditsPage.requestsTitle')}
              </h2>
              <ul className='divide-y rounded-xl border text-sm'>
                {ready.requests.map((request) => (
                  <li
                    key={request.id}
                    className='flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:justify-between'
                  >
                    <div className='min-w-0'>
                      <p className='font-medium'>
                        {t('creditsPage.requestLine', {
                          count: request.credits,
                          price: rupiah(request.price, i18n.language),
                        })}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {when(request.created_at)}
                      </p>
                      {request.status === 'rejected' && request.admin_note ? (
                        <p className='mt-1 text-xs text-destructive'>
                          {t('creditsPage.reason', {
                            note: request.admin_note,
                          })}
                        </p>
                      ) : null}
                    </div>
                    <RequestStatus status={request.status} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Where the credits went. */}
          <section className='space-y-3'>
            <h2 className='flex items-center gap-2 text-base font-semibold'>
              <History className='size-4' />
              {t('siteBuilder.credits.historyTitle')}
            </h2>
            {!ready ? (
              <p className='rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground'>
                {t('creditsPage.guestHistory')}
              </p>
            ) : ready.history.length === 0 ? (
              <p className='rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground'>
                {t('siteBuilder.credits.empty', { count: welcome })}
              </p>
            ) : (
              <ul className='divide-y rounded-xl border text-sm'>
                {ready.history.map((entry) => (
                  <li
                    key={entry.id}
                    className='flex items-start justify-between gap-3 p-4'
                  >
                    <div className='min-w-0'>
                      <p className='truncate'>
                        {t(`siteBuilder.credits.reasons.${entry.reason}`, {
                          name: entry.site_name || '-',
                        })}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {when(entry.created_at)}
                        {entry.note ? ` · ${entry.note}` : ''}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 font-medium',
                        entry.amount > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground'
                      )}
                    >
                      {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </Main>
  )
}

function RequestStatus({ status }: { status: TopUpRequest['status'] }) {
  const { t } = useTranslation()
  if (status === 'approved')
    return (
      <span className='inline-flex w-fit shrink-0 items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400'>
        <CheckCircle2 className='size-4' />
        {t('creditsPage.status.approved')}
      </span>
    )
  if (status === 'rejected')
    return (
      <span className='inline-flex w-fit shrink-0 items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs text-destructive'>
        <XCircle className='size-4' />
        {t('creditsPage.status.rejected')}
      </span>
    )
  return (
    <span className='inline-flex w-fit shrink-0 items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400'>
      <Clock className='size-4' />
      {t('creditsPage.status.pending')}
    </span>
  )
}

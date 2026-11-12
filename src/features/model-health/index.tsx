import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, CircleDashed, Gauge, Loader2, MoonStar, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { getModelHealth, type ModelHealth, type ModelHealthReport, type ModelHealthStatus, type ProviderHealth } from './data/api'

const STATUS_STYLE: Record<ModelHealthStatus, { icon: typeof Activity; className: string }> = {
  healthy: { icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  unstable: { icon: AlertTriangle, className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  resting: { icon: MoonStar, className: 'bg-destructive/10 text-destructive' },
  unused: { icon: CircleDashed, className: 'bg-muted text-muted-foreground' },
}

/** Which models answer well right now, and how much each provider has left today. */
export function ModelHealthPage() {
  const { t, i18n } = useTranslation()
  const [report, setReport] = useState<ModelHealthReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setReport(await getModelHealth())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('modelHealth.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const time = (value?: string) => (value ? new Date(value).toLocaleString(i18n.language === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }) : '—')

  return (
    <Main className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>{t('modelHealth.title')}</h1>
          <p className='mt-1 text-sm text-muted-foreground'>{t('modelHealth.subtitle', { hours: report?.window_hours ?? 24 })}</p>
        </div>
        <Button variant='outline' size='sm' onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className='size-4 animate-spin' /> : <RefreshCw className='size-4' />}
          {t('modelHealth.refresh')}
        </Button>
      </div>

      {loading && !report ? (
        <p className='flex items-center gap-2 text-sm text-muted-foreground' role='status'>
          <Loader2 className='size-4 animate-spin' />
          {t('modelHealth.loading')}
        </p>
      ) : error ? (
        <Card role='alert'>
          <CardContent className='py-10 text-center'>
            <p className='font-medium'>{t('modelHealth.loadFailed')}</p>
            <p className='mt-1 text-sm text-muted-foreground'>{error}</p>
            <Button className='mt-4' variant='outline' onClick={() => void load()}>{t('modelHealth.retry')}</Button>
          </CardContent>
        </Card>
      ) : report && report.models.length === 0 ? (
        <Card className='border-dashed'>
          <CardContent className='py-12 text-center'>
            <Activity className='mx-auto mb-3 size-8 text-muted-foreground' />
            <p className='font-medium'>{t('modelHealth.emptyTitle')}</p>
            <p className='mt-1 text-sm text-muted-foreground'>{t('modelHealth.emptyDescription')}</p>
          </CardContent>
        </Card>
      ) : report ? (
        <>
          <section className='space-y-3' aria-labelledby='quota-heading'>
            <h2 id='quota-heading' className='text-base font-semibold'>{t('modelHealth.quotaTitle')}</h2>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {report.providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} time={time} />
              ))}
            </div>
          </section>

          <section className='space-y-3' aria-labelledby='models-heading'>
            <h2 id='models-heading' className='text-base font-semibold'>{t('modelHealth.modelsTitle')}</h2>
            <div className='overflow-x-auto rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('modelHealth.columns.model')}</TableHead>
                    <TableHead>{t('modelHealth.columns.status')}</TableHead>
                    <TableHead className='text-right'>{t('modelHealth.columns.calls')}</TableHead>
                    <TableHead className='text-right'>{t('modelHealth.columns.success')}</TableHead>
                    <TableHead className='text-right'>{t('modelHealth.columns.busy')}</TableHead>
                    <TableHead className='text-right'>{t('modelHealth.columns.limited')}</TableHead>
                    <TableHead className='text-right'>{t('modelHealth.columns.speed')}</TableHead>
                    <TableHead>{t('modelHealth.columns.lastFailure')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.models.map((model) => (
                    <ModelRow key={model.id} model={model} time={time} />
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className='text-xs text-muted-foreground'>{t('modelHealth.note')}</p>
          </section>
        </>
      ) : null}
    </Main>
  )
}

function StatusBadge({ model, time }: { model: ModelHealth; time: (value?: string) => string }) {
  const { t } = useTranslation()
  const style = STATUS_STYLE[model.status] ?? STATUS_STYLE.unused
  const Icon = style.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium', style.className)}>
      <Icon aria-hidden='true' className='size-3.5' />
      {model.status === 'resting' ? t('modelHealth.status.restingUntil', { time: time(model.resting_until) }) : t(`modelHealth.status.${model.status}`)}
    </span>
  )
}

function ModelRow({ model, time }: { model: ModelHealth; time: (value?: string) => string }) {
  const { t } = useTranslation()
  const success = model.calls > 0 ? Math.round((model.succeeded / model.calls) * 100) : null
  return (
    <TableRow data-testid={`model-health-${model.id}`}>
      <TableCell>
        <p className='font-medium'>{model.name}</p>
        <p className='text-xs text-muted-foreground'>{model.provider} · {model.model_id}</p>
      </TableCell>
      <TableCell><StatusBadge model={model} time={time} /></TableCell>
      <TableCell className='text-right tabular-nums'>{model.calls}</TableCell>
      <TableCell className='text-right tabular-nums'>{success === null ? '—' : `${success}%`}</TableCell>
      <TableCell className={cn('text-right tabular-nums', model.busy > 0 && 'text-amber-700 dark:text-amber-400')}>{model.busy}</TableCell>
      <TableCell className={cn('text-right tabular-nums', model.limited > 0 && 'text-amber-700 dark:text-amber-400')}>{model.limited}</TableCell>
      <TableCell className='text-right tabular-nums'>{model.avg_latency_ms > 0 ? t('modelHealth.seconds', { value: (model.avg_latency_ms / 1000).toFixed(1) }) : '—'}</TableCell>
      <TableCell className='text-xs text-muted-foreground'>
        {model.last_failure ? `${time(model.last_failure)}${model.last_failure_status ? ` · HTTP ${model.last_failure_status}` : ''}` : '—'}
      </TableCell>
    </TableRow>
  )
}

function ProviderCard({ provider, time }: { provider: ProviderHealth; time: (value?: string) => string }) {
  const { t } = useTranslation()
  const { quota, openrouter } = provider
  const hasData = Boolean(quota) || Boolean(openrouter && Object.keys(openrouter).length > 0)
  return (
    <Card className='gap-3 py-4' data-testid={`provider-quota-${provider.id}`}>
      <CardHeader className='px-4'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <Gauge aria-hidden='true' className='size-4 text-muted-foreground' />
          {provider.name}
        </CardTitle>
        {!hasData && <CardDescription>{t('modelHealth.noQuota')}</CardDescription>}
      </CardHeader>
      {hasData && (
        <CardContent className='space-y-1 px-4 text-sm'>
          {quota?.remaining !== undefined && (
            <p>
              <span className='font-semibold tabular-nums'>{quota.remaining}</span>
              {quota.limit ? <span className='text-muted-foreground'> / {quota.limit}</span> : null}{' '}
              <span className='text-muted-foreground'>{t('modelHealth.requestsLeft')}</span>
            </p>
          )}
          {quota?.reset && <p className='text-xs text-muted-foreground'>{t('modelHealth.resets', { value: quota.reset })}</p>}
          {quota && <p className='text-xs text-muted-foreground'>{t('modelHealth.seenAt', { time: time(quota.seen_at) })}</p>}
          {openrouter && (
            <div className='space-y-1 pt-1 text-xs text-muted-foreground'>
              {openrouter.is_free_tier !== undefined && <p>{openrouter.is_free_tier ? t('modelHealth.openrouter.freeTier') : t('modelHealth.openrouter.paidTier')}</p>}
              {openrouter.usage_daily !== undefined && <p>{t('modelHealth.openrouter.usageToday', { value: openrouter.usage_daily })}</p>}
              {openrouter.limit_remaining !== undefined && openrouter.limit_remaining !== null && <p>{t('modelHealth.openrouter.creditLeft', { value: openrouter.limit_remaining })}</p>}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

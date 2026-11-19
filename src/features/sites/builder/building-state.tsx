import { useEffect, useState } from 'react'
import { CircleAlert, Clock, Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AgentRun, RunStep, SiteDetail } from '../data/api'

// A site is usually made in 5 to 15 minutes (WEBSITE-BUILDER.md, section 16).
const USUAL_MINUTES = 15

/**
 * The right side while the first version is being made: what is happening, how long
 * it usually takes and how far it is, with a drawing of a page that fills in.
 */
export function BuildingState({
  site,
  run,
  steps,
}: {
  site: SiteDetail
  run: AgentRun | null
  steps: RunStep[]
}) {
  const { t } = useTranslation()
  const now = useNow()
  const active = run?.status === 'queued' || run?.status === 'running'

  if (!active) {
    return (
      <div className='m-auto flex max-w-sm flex-col items-center gap-3 p-6 text-center'>
        <span className='flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400'>
          <CircleAlert className='size-6' />
        </span>
        <h2 className='text-base font-semibold'>
          {t('siteBuilder.run.failedTitle')}
        </h2>
        <p className='text-sm text-muted-foreground'>
          {t('siteBuilder.screen.failedHelp')}
        </p>
      </div>
    )
  }

  const started = new Date(run.started_at ?? run.created_at).getTime()
  const minutes = Math.max(0, Math.floor((now - started) / 60000))
  // The steps of a first run: the generated files, the menu, each page, the check
  // and the review. The share done is an estimate, never shown as finished.
  const expected = (site.brief?.pages.length ?? 4) + 4
  const done = steps.filter((step) => step.status === 'done').length
  const percent = Math.min(95, Math.max(5, Math.round((done / expected) * 100)))
  const current = [...steps].reverse().find((step) => step.status === 'running')
  const queued = run.status === 'queued'

  return (
    <div className='m-auto flex w-full max-w-lg flex-col gap-6 p-6'>
      <div className='flex flex-col items-center gap-3 text-center'>
        <span className='flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary'>
          <Sparkles className='size-6' />
        </span>
        <h2 className='text-xl font-semibold tracking-tight'>
          {t('siteBuilder.run.buildingTitle')}
        </h2>
        <p className='text-sm text-muted-foreground'>
          {t('siteBuilder.screen.estimate')}
        </p>
      </div>

      <div className='space-y-2'>
        <div className='flex items-center justify-between gap-2 text-xs text-muted-foreground'>
          <span className='inline-flex items-center gap-1'>
            <Clock className='size-4' />
            {queued
              ? t('siteBuilder.run.waiting')
              : t('siteBuilder.screen.elapsed', { count: minutes })}
          </span>
          <span>{t('siteBuilder.screen.percent', { percent })}</span>
        </div>
        <div
          role='progressbar'
          aria-label={t('siteBuilder.run.steps')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className='h-2 overflow-hidden rounded-full bg-muted'
        >
          <div
            className='h-full rounded-full bg-primary transition-all'
            style={{ width: `${percent}%` }}
          />
        </div>
        {current ? (
          <p className='flex items-start gap-2 text-sm'>
            <Loader2 className='mt-0.5 size-4 shrink-0 animate-spin text-primary' />
            {current.summary}
          </p>
        ) : null}
        {minutes > USUAL_MINUTES ? (
          <p className='text-xs text-muted-foreground'>
            {t('siteBuilder.screen.slow')}
          </p>
        ) : null}
      </div>

      <PageDrawing filled={percent} />

      <p className='text-center text-xs text-muted-foreground'>
        {t('siteBuilder.screen.leave')}
      </p>
    </div>
  )
}

/** A small drawing of a web page whose blocks appear as the work goes on. */
function PageDrawing({ filled }: { filled: number }) {
  const blocks = [
    'h-3 w-1/3',
    'h-8 w-3/4',
    'h-3 w-2/3',
    'h-16 w-full',
    'h-3 w-1/2',
    'h-10 w-full',
  ]
  const shown = Math.max(1, Math.ceil((filled / 100) * blocks.length))
  return (
    <div
      aria-hidden
      className='overflow-hidden rounded-lg border bg-background'
    >
      <div className='flex items-center gap-1 border-b px-3 py-2'>
        <span className='size-2 rounded-full bg-muted-foreground/30' />
        <span className='size-2 rounded-full bg-muted-foreground/30' />
        <span className='size-2 rounded-full bg-muted-foreground/30' />
        <span className='ml-2 h-2 flex-1 rounded-full bg-muted' />
      </div>
      <div className='space-y-3 p-4'>
        {blocks.map((size, index) => (
          <div
            key={size}
            className={
              index < shown
                ? `${size} rounded-md bg-muted transition-colors motion-safe:animate-pulse`
                : `${size} rounded-md border border-dashed`
            }
          />
        ))}
      </div>
    </div>
  )
}

/** The current time, updated every 30 seconds. */
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

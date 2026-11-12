import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { describePhase, formatElapsed, type RunPhase } from './run-phase'

type Props = {
  /** What the agent is doing now; null when nothing has run yet. */
  phase: RunPhase | null
  /** The last steps already done, oldest first. */
  trail: RunPhase[]
  /** When the run started (ms since epoch), for the timer. */
  startedAt: number | null
  running: boolean
  /** Who is working, to name them while the model thinks. */
  agentName?: string
  modelName?: string
}

/**
 * The strip over the composer while an agent works. It follows what is really happening:
 * each kind of work has its own icon and words (reading index.html, running the tests, waiting
 * for your approval), the bar slides while work goes on, holds still while it waits for the
 * person and fills when done, and the steps already done stay as a short trail with a timer.
 */
export function RunProgress({ phase, trail, startedAt, running, agentName, modelName }: Props) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [running])

  if (!phase) return null

  const view = describePhase(phase)
  const Icon = view.icon
  const label = (step: RunPhase) => {
    const described = describePhase(step)
    return t(`agentic.phase.${described.labelKey}`, { agent: agentName ?? 'Agent', model: modelName ?? '', ...described.values })
  }
  const waiting = view.motion === 'waiting'
  const complete = view.motion === 'complete'
  const elapsed = startedAt === null ? null : formatElapsed(Math.max(now, startedAt) - startedAt)

  return (
    <div className='px-4 pb-2 sm:px-6' data-testid='run-progress' data-phase={phase.kind} data-motion={view.motion}>
      <div className='mx-auto w-full max-w-4xl'>
        <div className='flex items-center justify-between gap-3 text-sm'>
          <p className='flex min-w-0 items-center gap-2' role='status'>
            <span
              aria-hidden='true'
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-md',
                waiting ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : complete ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-foreground'
              )}
            >
              <Icon className={cn('size-4', running && !waiting && !complete && 'motion-safe:animate-pulse')} />
            </span>
            <span className={cn('truncate', waiting ? 'text-amber-700 dark:text-amber-400' : 'text-foreground')}>{label(phase)}</span>
          </p>
          {elapsed !== null && (
            <p className='shrink-0 text-xs tabular-nums text-muted-foreground'>
              <span className='sr-only'>{t('agentic.phase.elapsed')} </span>
              {elapsed}
            </p>
          )}
        </div>

        <div className='mt-1.5 h-0.5 overflow-hidden rounded-full bg-muted' aria-hidden='true' data-testid='run-progress-bar'>
          <div
            className={cn(
              'h-full',
              complete ? 'w-full bg-primary' : waiting ? 'w-1/3 bg-muted-foreground/40' : 'w-1/3 bg-primary motion-safe:animate-progress-slide'
            )}
          />
        </div>

        {trail.length > 0 && (
          <ol className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground' aria-label={t('agentic.phase.trail')}>
            {trail.map((step, index) => (
              <li key={index} className='flex min-w-0 items-center gap-1'>
                <Check aria-hidden='true' className='size-3 shrink-0' />
                <span className='max-w-56 truncate'>{label(step)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { ChevronDown, CircleAlert, CircleCheck, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { AgentRun, RunStep } from '../data/api'

type RunProgressProps = {
  run: AgentRun | null
  steps: RunStep[]
  compact?: boolean
}

/**
 * The steps of a run in plain sentences. Technical details (model, files, check output)
 * stay behind "Show technical details", closed by default.
 */
export function RunProgress({ run, steps, compact }: RunProgressProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const waiting =
    run?.status === 'queued' ||
    (run?.status === 'running' && steps.length === 0)
  const ended =
    run !== null && run.status !== 'queued' && run.status !== 'running'
  // A step cannot still be working once its run has ended.
  const shown = (compact ? steps.slice(-5) : steps).map((step) =>
    ended && step.status === 'running'
      ? { ...step, status: 'failed' as const }
      : step
  )

  return (
    <div className='space-y-3'>
      <ol className='space-y-2' aria-label={t('siteBuilder.run.steps')}>
        {waiting ? (
          <li className='flex items-center gap-2 text-sm text-muted-foreground'>
            <Loader2 className='size-4 animate-spin' />
            {t('siteBuilder.run.waiting')}
          </li>
        ) : null}
        {shown.map((step) => (
          <li key={step.id} className='flex items-start gap-2 text-sm'>
            {step.status === 'running' ? (
              <Loader2 className='mt-0.5 size-4 shrink-0 animate-spin text-primary' />
            ) : step.status === 'done' ? (
              <CircleCheck className='mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400' />
            ) : (
              <CircleAlert className='mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400' />
            )}
            <span
              className={cn(
                step.status === 'running'
                  ? 'font-medium'
                  : 'text-muted-foreground'
              )}
            >
              {step.summary}
              <span className='sr-only'>
                {' '}
                (
                {step.status === 'running'
                  ? t('siteBuilder.run.stepRunning')
                  : step.status === 'done'
                    ? t('siteBuilder.run.stepDone')
                    : t('siteBuilder.run.stepFailed')}
                )
              </span>
            </span>
          </li>
        ))}
      </ol>

      {steps.some((step) => step.detail) ? (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='-ml-2 text-xs text-muted-foreground'
            >
              <ChevronDown
                className={cn(
                  'size-4 transition-transform',
                  open && 'rotate-180'
                )}
              />
              {open
                ? t('siteBuilder.run.hideDetails')
                : t('siteBuilder.run.details')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-2 space-y-2'>
            {steps
              .filter((step) => step.detail)
              .map((step) => (
                <div
                  key={step.id}
                  className='rounded-md border bg-muted/50 p-3'
                >
                  <p className='text-xs font-medium'>{step.summary}</p>
                  <pre className='mt-1 max-h-48 overflow-auto text-xs whitespace-pre-wrap text-muted-foreground'>
                    {step.detail}
                  </pre>
                </div>
              ))}
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  )
}

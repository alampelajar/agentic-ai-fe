import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Play, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ACTIVE_JOB_STATUSES, cancelExecution, getExecutions, INSTALL_JOB_TYPES, JOB_TYPES, startExecution, type ExecutionJob, type JobType } from './data/api'

/** How often a running job is refreshed. */
export const POLL_INTERVAL_MS = 2000

const isActive = (job: ExecutionJob) => ACTIVE_JOB_STATUSES.includes(job.status)

export function ExecutionConsole({ workspaceId }: { workspaceId: number }) {
  const { t, i18n } = useTranslation()
  const [jobs, setJobs] = useState<ExecutionJob[]>([])
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [jobType, setJobType] = useState<JobType>('go-test')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const latestRequest = useRef(0)

  const load = useCallback(
    async (quiet = false) => {
      const request = ++latestRequest.current
      if (!quiet) setLoading(true)
      try {
        const loaded = await getExecutions(workspaceId)
        if (request !== latestRequest.current) return
        setJobs(loaded.jobs)
        setEnabled(loaded.executionEnabled)
        setLoadError(null)
      } catch (error) {
        if (request !== latestRequest.current) return
        if (!quiet) setLoadError(error instanceof Error ? error.message : t('workspacePage.console.loadFailed'))
      } finally {
        if (request === latestRequest.current && !quiet) setLoading(false)
      }
    },
    [workspaceId, t]
  )

  useEffect(() => {
    void load()
  }, [load])

  // Poll only while a job is running; the timer is gone as soon as nothing is active or the console closes.
  const anyActive = jobs.some(isActive)
  useEffect(() => {
    if (!anyActive) return
    const timer = setInterval(() => void load(true), POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [anyActive, load])

  const selected = jobs.find((job) => job.id === selectedId) ?? jobs[0] ?? null

  const start = async () => {
    setStarting(true)
    setStartError(null)
    try {
      const job = await startExecution(workspaceId, jobType)
      setSelectedId(job.id)
      await load(true)
    } catch (error) {
      setStartError(error instanceof Error ? error.message : t('workspacePage.console.startFailed'))
    } finally {
      setStarting(false)
    }
  }

  const cancel = async (job: ExecutionJob) => {
    try {
      const updated = await cancelExecution(job.id)
      setJobs((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      await load(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('workspacePage.console.cancelFailed'))
    }
  }

  const variant = (status: ExecutionJob['status']) => (status === 'completed' ? 'default' : status === 'failed' || status === 'timed_out' ? 'destructive' : 'secondary')

  return (
    <div className='space-y-4'>
      {!enabled && <p data-testid='execution-disabled' className='rounded-md border border-dashed p-3 text-sm text-muted-foreground'>{t('workspacePage.console.disabled')}</p>}
      <div className='flex flex-wrap items-center gap-2'>
        <select aria-label={t('workspacePage.console.command')} className='h-9 rounded-md border bg-background px-3 text-sm' value={jobType} onChange={(event) => setJobType(event.target.value as JobType)}>
          {JOB_TYPES.map((type) => <option key={type} value={type}>{t(`workspacePage.console.jobTypes.${type}`)}</option>)}
        </select>
        <Button onClick={() => void start()} disabled={!enabled || starting}>
          {starting ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Play className='mr-2 size-4' />}
          {t('workspacePage.console.run')}
        </Button>
      </div>
      {INSTALL_JOB_TYPES.includes(jobType) && <p data-testid='install-hint' className='text-xs text-muted-foreground'>{t('workspacePage.console.installHint')}</p>}
      {startError && <p role='alert' className='text-sm text-destructive'>{startError}</p>}

      {loading ? (
        <p className='flex items-center gap-2 text-sm text-muted-foreground'><Loader2 className='size-4 animate-spin' />{t('workspacePage.console.loading')}</p>
      ) : loadError ? (
        <div role='alert' className='rounded-md border p-4 text-center'>
          <p className='font-medium'>{t('workspacePage.console.loadFailed')}</p>
          <p className='mt-1 text-sm text-muted-foreground'>{loadError}</p>
          <Button className='mt-3' variant='outline' onClick={() => void load()}>{t('workspacePage.actions.retry')}</Button>
        </div>
      ) : jobs.length === 0 ? (
        <p className='text-sm text-muted-foreground'>{t('workspacePage.console.empty')}</p>
      ) : (
        <div className='grid gap-4 lg:grid-cols-[18rem_1fr]'>
          <ul className='space-y-2' aria-label={t('workspacePage.console.jobs')}>
            {jobs.map((job) => (
              <li key={job.id}>
                <button type='button' data-testid='job-item' onClick={() => setSelectedId(job.id)} className={`w-full rounded-md border p-2 text-left text-sm hover:bg-muted ${selected?.id === job.id ? 'border-primary' : ''}`}>
                  <span className='flex items-center justify-between gap-2'>
                    <span className='font-mono'>{job.command}</span>
                    <Badge variant={variant(job.status)}>{t(`workspacePage.console.statuses.${job.status}`)}</Badge>
                  </span>
                  <span className='text-xs text-muted-foreground'>#{job.id} · {new Date(job.created_at).toLocaleString(i18n.language)}</span>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <div className='space-y-3' data-testid='job-detail'>
              <div className='flex flex-wrap items-center gap-2'>
                <code className='rounded bg-muted px-2 py-1 text-sm'>{selected.command}</code>
                <Badge variant={variant(selected.status)}>{t(`workspacePage.console.statuses.${selected.status}`)}</Badge>
                {selected.exit_code !== null && <span className='text-xs text-muted-foreground'>{t('workspacePage.console.exitCode', { code: selected.exit_code })}</span>}
                <span className='text-xs text-muted-foreground'>{t('workspacePage.console.duration', { seconds: (selected.duration_ms / 1000).toFixed(1) })}</span>
                {isActive(selected) && (
                  <Button size='sm' variant='outline' className='ml-auto' disabled={selected.cancel_requested} onClick={() => void cancel(selected)}>
                    <Square className='mr-1.5 size-3.5' />
                    {selected.cancel_requested ? t('workspacePage.console.cancelling') : t('workspacePage.console.cancel')}
                  </Button>
                )}
              </div>
              {selected.error && <p className='text-sm text-destructive'>{selected.error}</p>}
              <div>
                <p className='mb-1 text-xs font-medium text-muted-foreground'>stdout</p>
                <pre data-testid='job-stdout' className='max-h-80 overflow-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap'>{selected.stdout || t('workspacePage.console.noOutput')}</pre>
              </div>
              {selected.stderr && (
                <div>
                  <p className='mb-1 text-xs font-medium text-muted-foreground'>stderr</p>
                  <pre data-testid='job-stderr' className='max-h-60 overflow-auto rounded-md border border-destructive/30 bg-muted/40 p-3 text-xs whitespace-pre-wrap'>{selected.stderr}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

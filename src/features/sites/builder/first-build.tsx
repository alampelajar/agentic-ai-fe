import { useState } from 'react'
import { CircleAlert, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { startRun, type SiteDetail } from '../data/api'
import { siteErrorText } from '../errors'
import { RunProgress } from '../run-progress'
import { useRun } from '../use-run'
import { CancelButton } from './cancel-button'

/** The first run, before there is anything to preview. */
export function FirstBuild({
  site,
  onChanged,
  onEdit,
}: {
  site: SiteDetail
  onChanged: () => void
  onEdit: () => void
}) {
  const { t } = useTranslation()
  const runId = site.active_run_id ?? site.last_run?.id
  const { run, steps } = useRun(site.id, runId, (finished) => {
    if (finished.status === 'completed')
      toast.success(t('siteBuilder.toast.done'))
    onChanged()
  })
  const [busy, setBusy] = useState(false)
  const current = run ?? site.last_run ?? null
  const active = current?.status === 'queued' || current?.status === 'running'

  const retry = async () => {
    setBusy(true)
    try {
      await startRun(site.id, { kind: 'create' })
      onChanged()
    } catch (problem) {
      toast.error(siteErrorText(t, problem))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardContent className='space-y-6'>
        <div>
          <p className='text-sm text-muted-foreground'>{site.name}</p>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {active
              ? t('siteBuilder.run.buildingTitle')
              : t('siteBuilder.run.failedTitle')}
          </h1>
          {active ? (
            <p className='mt-1 text-sm text-muted-foreground'>
              {t('siteBuilder.run.buildingHelp')}
            </p>
          ) : null}
        </div>
        {!active && site.can_continue ? (
          <p className='text-sm text-muted-foreground'>
            {t('siteBuilder.run.continueHelp')}
          </p>
        ) : null}
        {!active && current?.error_message ? (
          <p
            role='alert'
            className='flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive'
          >
            <CircleAlert className='mt-0.5 size-4 shrink-0' />
            {current.error_message}
          </p>
        ) : null}
        <RunProgress run={current} steps={steps} />
        <div className='flex flex-wrap gap-2'>
          {active && current ? (
            <CancelButton siteId={site.id} run={current} />
          ) : null}
          {!active ? (
            <>
              <Button onClick={() => void retry()} disabled={busy}>
                {busy ? <Loader2 className='size-4 animate-spin' /> : null}
                {site.can_continue
                  ? t('siteBuilder.run.continue')
                  : t('siteBuilder.run.tryAgain')}
              </Button>
              <Button variant='outline' onClick={onEdit} disabled={busy}>
                {t('siteBuilder.wizard.editAnswers')}
              </Button>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

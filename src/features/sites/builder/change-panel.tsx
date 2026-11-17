import { useState } from 'react'
import { CircleAlert, CircleCheck, Loader2, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  startRun,
  type AgentRun,
  type RunStep,
  type SiteDetail,
} from '../data/api'
import { siteErrorText } from '../errors'
import { RunProgress } from '../run-progress'
import { CancelButton } from './cancel-button'

/** The id of the change box, so other parts of the screen can focus it. */
export const CHANGE_REQUEST_ID = 'site-request'

type ChangePanelProps = {
  site: SiteDetail
  /** The run in progress, if any. */
  run: AgentRun | null
  steps: RunStep[]
  busy: boolean
  reload: () => Promise<void>
}

/** Ask for a change in words, follow it while it runs, and see the last one. */
export function ChangePanel({
  site,
  run,
  steps,
  busy,
  reload,
}: ChangePanelProps) {
  const { t } = useTranslation()
  const [request, setRequest] = useState('')
  const [sending, setSending] = useState(false)
  const lastRun = site.last_run

  // Starts a change and reloads the site; the buttons stay disabled until both are done.
  const start = async (
    options: Parameters<typeof startRun>[1],
    onStarted?: () => void
  ) => {
    setSending(true)
    try {
      await startRun(site.id, options)
      onStarted?.()
      await reload()
    } catch (problem) {
      toast.error(siteErrorText(t, problem))
    } finally {
      setSending(false)
    }
  }

  const send = () =>
    start({ kind: 'revise', request: request.trim() }, () => setRequest(''))

  // A change that stopped halfway continues from the parts already made.
  const continueChange = async () => {
    if (!lastRun) return
    await start({
      kind: 'revise',
      request: lastRun.request || undefined,
      direction: lastRun.direction || undefined,
      variant: lastRun.variant || undefined,
    })
  }

  return (
    <>
      <Card>
        <CardContent className='space-y-3'>
          <Label htmlFor={CHANGE_REQUEST_ID}>
            {t('siteBuilder.workspace.reviseLabel')}
          </Label>
          <Textarea
            id={CHANGE_REQUEST_ID}
            rows={4}
            maxLength={2000}
            value={request}
            disabled={busy}
            onChange={(event) => setRequest(event.target.value)}
            placeholder={t('siteBuilder.workspace.revisePlaceholder')}
            aria-describedby='site-request-help'
          />
          <p id='site-request-help' className='text-xs text-muted-foreground'>
            {busy
              ? t('siteBuilder.workspace.busy')
              : t('siteBuilder.workspace.reviseHelp')}
          </p>
          <Button
            className='w-full'
            onClick={() => void send()}
            disabled={busy || sending || request.trim().length < 3}
          >
            {sending ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Send className='size-4' />
            )}
            {sending
              ? t('siteBuilder.workspace.reviseSending')
              : t('siteBuilder.workspace.reviseSend')}
          </Button>
        </CardContent>
      </Card>

      {busy ? (
        <Card>
          <CardContent className='space-y-3'>
            <h2 className='text-base font-semibold'>
              {t('siteBuilder.run.changingTitle')}
            </h2>
            <RunProgress run={run} steps={steps} compact />
            {run ? <CancelButton siteId={site.id} run={run} /> : null}
          </CardContent>
        </Card>
      ) : lastRun ? (
        <Card>
          <CardContent className='space-y-2'>
            <h2 className='text-base font-semibold'>
              {t('siteBuilder.workspace.lastChange')}
            </h2>
            {lastRun.request ? (
              <p className='text-sm italic'>"{lastRun.request}"</p>
            ) : null}
            {lastRun.status === 'completed' ? (
              <p className='flex items-start gap-2 text-sm text-emerald-600 dark:text-emerald-400'>
                <CircleCheck className='mt-0.5 size-4 shrink-0' />
                {lastRun.summary}
              </p>
            ) : lastRun.error_message ? (
              <p
                role='alert'
                className='flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400'
              >
                <CircleAlert className='mt-0.5 size-4 shrink-0' />
                {lastRun.error_message}
              </p>
            ) : null}
            {lastRun.status !== 'completed' &&
            lastRun.kind === 'revise' &&
            site.can_continue ? (
              <div className='space-y-2'>
                <p className='text-xs text-muted-foreground'>
                  {t('siteBuilder.run.continueHelp')}
                </p>
                <Button
                  size='sm'
                  onClick={() => void continueChange()}
                  disabled={sending || busy}
                >
                  {sending ? <Loader2 className='size-4 animate-spin' /> : null}
                  {t('siteBuilder.run.continue')}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </>
  )
}

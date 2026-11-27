import { useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  CircleAlert,
  CircleCheck,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RunProgress } from '../components/run-progress'
import {
  startRun,
  type AgentRun,
  type RunStep,
  type SiteDetail,
} from '../data/api'
import { siteErrorText } from '../lib/errors'
import { MAX_SITE_TEXT } from '../lib/limits'
import { CancelButton } from './cancel-button'

/** The id of the change box, so other parts of the screen can focus it. */
export const CHANGE_REQUEST_ID = 'site-request'
// Things people often want to change, each the start of a request (siteBuilder.ideas).
const IDEAS = [
  'colour',
  'headline',
  'page',
  'section',
  'contact',
  'photo',
] as const

type ConversationProps = {
  site: SiteDetail
  /** The run being followed: the active one, or the last one once it ended. */
  run: AgentRun | null
  steps: RunStep[]
  busy: boolean
  reload: () => Promise<void>
  onEdit: () => void
}

/**
 * The left side: what the person asked for, what the AI is doing or did, and the box
 * to ask for a change.
 */
export function Conversation({
  site,
  run,
  steps,
  busy,
  reload,
  onEdit,
}: ConversationProps) {
  const { t } = useTranslation()
  const [request, setRequest] = useState('')
  const [sending, setSending] = useState(false)
  const current = run ?? site.last_run ?? null
  const active = current?.status === 'queued' || current?.status === 'running'
  const canChange = site.has_version && !busy
  const log = useRef<HTMLDivElement>(null)

  // The newest step stays in sight, below a long description.
  useEffect(() => {
    const element = log.current
    if (element) element.scrollTop = element.scrollHeight
  }, [steps.length, current?.status])

  // Starts a run and reloads the site; the buttons stay disabled until both are done.
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

  // A run that stopped halfway continues from the parts already made.
  const again = () =>
    current?.kind === 'revise'
      ? start({
          kind: 'revise',
          request: current.request || undefined,
          direction: current.direction || undefined,
          variant: current.variant || undefined,
        })
      : start({ kind: 'create' })

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div ref={log} className='min-h-0 flex-1 space-y-4 overflow-y-auto p-4'>
        <Bubble>{site.description}</Bubble>

        {current?.kind === 'revise' && current.request ? (
          <Bubble>{current.request}</Bubble>
        ) : null}

        {current ? (
          <section className='space-y-3' aria-live='polite'>
            <h2 className='flex items-center gap-2 text-sm font-semibold'>
              <Sparkles className='size-4 text-primary' />
              {active
                ? current.kind === 'revise'
                  ? t('siteBuilder.run.changingTitle')
                  : t('siteBuilder.run.buildingTitle')
                : current.status === 'completed'
                  ? t('siteBuilder.run.doneTitle')
                  : current.kind === 'revise'
                    ? t('siteBuilder.screen.changeStopped')
                    : t('siteBuilder.run.failedTitle')}
            </h2>

            {current.status === 'completed' && current.summary ? (
              <p className='flex items-start gap-2 text-sm text-emerald-600 dark:text-emerald-400'>
                <CircleCheck className='mt-0.5 size-4 shrink-0' />
                {current.summary}
              </p>
            ) : null}
            {!active &&
            current.status !== 'completed' &&
            current.error_message ? (
              <p
                role='alert'
                className='flex items-start gap-2 rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400'
              >
                <CircleAlert className='mt-0.5 size-4 shrink-0' />
                {current.error_message}
              </p>
            ) : null}

            {/* Steps are only known for the run followed on this page. */}
            {run ? <RunProgress run={run} steps={steps} /> : null}

            {active && run ? <CancelButton siteId={site.id} run={run} /> : null}

            {!active && current.status !== 'completed' ? (
              <div className='space-y-2'>
                {site.can_continue ? (
                  <p className='text-xs text-muted-foreground'>
                    {t('siteBuilder.run.continueHelp')}
                  </p>
                ) : null}
                <div className='flex flex-wrap gap-2'>
                  <Button
                    size='sm'
                    onClick={() => void again()}
                    disabled={sending || busy}
                  >
                    {sending ? (
                      <Loader2 className='size-4 animate-spin' />
                    ) : null}
                    {site.can_continue
                      ? t('siteBuilder.run.continue')
                      : t('siteBuilder.run.tryAgain')}
                  </Button>
                  {!site.has_version ? (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={onEdit}
                      disabled={sending}
                    >
                      {t('siteBuilder.wizard.editAnswers')}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {site.has_version && !active && current?.status === 'completed' ? (
          <p className='rounded-lg border bg-muted p-3 text-sm text-muted-foreground'>
            {site.published
              ? t('siteBuilder.screen.nextPublished')
              : t('siteBuilder.workspace.introHelp')}
          </p>
        ) : null}
      </div>

      <form
        className='border-t p-3'
        onSubmit={(event) => {
          event.preventDefault()
          if (canChange && request.trim().length >= 3) void send()
        }}
      >
        <Label htmlFor={CHANGE_REQUEST_ID} className='sr-only'>
          {t('siteBuilder.workspace.reviseLabel')}
        </Label>
        {canChange && request.trim() === '' ? (
          // Someone who cannot code may not know what they can ask for: each idea
          // starts the sentence, and they finish it in their own words.
          <div className='mb-2 space-y-1'>
            <p className='text-xs text-muted-foreground'>
              {t('siteBuilder.ideas.label')}
            </p>
            <div className='flex flex-wrap gap-1'>
              {IDEAS.map((idea) => (
                <Button
                  key={idea}
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-7 rounded-full px-3 text-xs font-normal'
                  onClick={() => {
                    setRequest(t(`siteBuilder.ideas.${idea}.start`))
                    const box = document.getElementById(CHANGE_REQUEST_ID)
                    if (box instanceof HTMLTextAreaElement) box.focus()
                  }}
                >
                  {t(`siteBuilder.ideas.${idea}.label`)}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        <div className='rounded-xl border bg-background transition-colors focus-within:border-ring'>
          <Textarea
            id={CHANGE_REQUEST_ID}
            rows={3}
            maxLength={MAX_SITE_TEXT}
            value={request}
            disabled={!canChange}
            onChange={(event) => setRequest(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter adds a new line.
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (canChange && request.trim().length >= 3) void send()
              }
            }}
            placeholder={
              site.has_version
                ? t('siteBuilder.workspace.revisePlaceholder')
                : t('siteBuilder.screen.changeLater')
            }
            aria-describedby='site-request-help'
            className='min-h-20 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent'
          />
          <div className='flex items-center justify-between gap-2 px-3 pb-2'>
            <p id='site-request-help' className='text-xs text-muted-foreground'>
              {busy
                ? t('siteBuilder.workspace.busy')
                : site.plan && !site.plan.unlimited && site.has_version
                  ? t('siteBuilder.credits.changeCost', {
                      count: site.plan.revise_cost,
                    })
                  : t('siteBuilder.workspace.reviseHelp')}
            </p>
            <Button
              type='submit'
              size='icon'
              className='shrink-0 rounded-full'
              aria-label={t('siteBuilder.workspace.reviseSend')}
              disabled={!canChange || sending || request.trim().length < 3}
            >
              {sending ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <ArrowUp className='size-4' />
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

/** What the person wrote, shown as their message. */
function Bubble({ children }: { children: string }) {
  return (
    <p className='ml-auto w-fit max-w-5/6 rounded-xl rounded-br-md bg-muted px-3 py-2 text-sm whitespace-pre-wrap'>
      {children}
    </p>
  )
}

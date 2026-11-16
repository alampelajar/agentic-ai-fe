import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  Globe,
  History,
  Loader2,
  Palette,
  Send,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Main } from '@/components/layout/main'
import {
  cancelRun,
  getSite,
  startRun,
  type AgentRun,
  type SiteDetail,
} from './data/api'
import { siteErrorText } from './errors'
import { LookDialog } from './look-dialog'
import { PreviewPane } from './preview-pane'
import { PublishDialog } from './publish-dialog'
import { RunProgress } from './run-progress'
import { SetupWizard } from './setup-wizard'
import { useRun } from './use-run'
import { VersionsDialog } from './versions-dialog'

export function SiteBuilderRoute() {
  const { siteId } = useParams({ from: '/_authenticated/sites/$siteId' })
  return <SiteBuilder key={siteId} siteId={Number(siteId)} />
}

function SiteBuilder({ siteId }: { siteId: number }) {
  const { t } = useTranslation()
  const [site, setSite] = useState<SiteDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    try {
      setSite(await getSite(siteId))
      setError(null)
    } catch (problem) {
      setError(siteErrorText(t, problem))
    }
  }, [siteId, t])

  useEffect(() => {
    void load()
  }, [load])

  const header = (
    <Button variant='ghost' size='sm' asChild className='-ml-2 w-fit'>
      <Link to='/sites'>
        <ArrowLeft className='size-4' />
        {t('siteBuilder.back')}
      </Link>
    </Button>
  )

  if (error) {
    return (
      <Main className='space-y-6'>
        {header}
        <Card role='alert'>
          <CardContent className='py-10 text-center'>
            <p className='font-medium'>{error}</p>
            <Button
              className='mt-4'
              variant='outline'
              onClick={() => void load()}
            >
              {t('siteBuilder.retry')}
            </Button>
          </CardContent>
        </Card>
      </Main>
    )
  }
  if (!site) {
    return (
      <Main>
        <p className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Loader2 className='size-4 animate-spin' />
          {t('siteBuilder.loading')}
        </p>
      </Main>
    )
  }

  const running = site.active_run_id !== undefined
  const needsSetup =
    !site.has_version &&
    !running &&
    (editing || !site.brief || site.status === 'draft')

  if (needsSetup) {
    return (
      <Main className='mx-auto w-full max-w-4xl space-y-6'>
        {header}
        <div>
          <p className='text-sm text-muted-foreground'>
            {t('siteBuilder.eyebrow')}
          </p>
          <h1 className='text-2xl font-semibold tracking-tight'>{site.name}</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            {site.description}
          </p>
        </div>
        <SetupWizard
          site={site}
          onStarted={() => {
            setEditing(false)
            void load()
          }}
        />
      </Main>
    )
  }

  if (!site.has_version) {
    return (
      <Main className='mx-auto w-full max-w-3xl space-y-6'>
        {header}
        <FirstBuild
          site={site}
          onChanged={() => void load()}
          onEdit={() => setEditing(true)}
        />
      </Main>
    )
  }

  return <Workspace site={site} header={header} reload={load} />
}

/** The first run, before there is anything to preview. */
function FirstBuild({
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

function CancelButton({ siteId, run }: { siteId: number; run: AgentRun }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const stopping = busy || run.cancel_requested
  const cancel = async () => {
    setBusy(true)
    try {
      await cancelRun(siteId, run.id)
      toast.success(t('siteBuilder.toast.cancelled'))
      setOpen(false)
    } catch (problem) {
      toast.error(siteErrorText(t, problem))
      setBusy(false)
    }
  }
  return (
    <>
      <Button
        variant='outline'
        onClick={() => setOpen(true)}
        disabled={stopping}
      >
        {stopping ? <Loader2 className='size-4 animate-spin' /> : null}
        {stopping
          ? t('siteBuilder.run.cancelling')
          : t('siteBuilder.run.cancel')}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t('siteBuilder.run.cancelTitle')}
        desc={t('siteBuilder.run.cancelDesc')}
        confirmText={t('siteBuilder.run.cancel')}
        cancelBtnText={t('siteBuilder.publish.close')}
        destructive
        isLoading={busy}
        handleConfirm={() => void cancel()}
      />
    </>
  )
}

/** A site with a version: change it by chat, see the preview, publish. */
function Workspace({
  site,
  header,
  reload,
}: {
  site: SiteDetail
  header: React.ReactNode
  reload: () => Promise<void>
}) {
  const { t } = useTranslation()
  const [request, setRequest] = useState('')
  const [sending, setSending] = useState(false)
  const [dialog, setDialog] = useState<'publish' | 'versions' | 'look' | null>(
    null
  )
  // A website seen for the first time opens on the preview, with one sentence of what to do.
  const [intro, setIntro] = useState(
    !site.published &&
      site.versions.length <= 1 &&
      site.active_run_id === undefined
  )
  const askForChange = () => {
    setIntro(false)
    window.setTimeout(() => document.getElementById('site-request')?.focus(), 0)
  }
  const runId = site.active_run_id
  const { run, steps } = useRun(site.id, runId, (finished) => {
    if (finished.status === 'completed')
      toast.success(t('siteBuilder.toast.changeDone'))
    else if (finished.status === 'failed')
      toast.error(finished.error_message || t('siteBuilder.toast.runFailed'))
    void reload()
  })
  const busy = runId !== undefined

  const send = async () => {
    setSending(true)
    try {
      await startRun(site.id, { kind: 'revise', request: request.trim() })
      setRequest('')
      await reload()
    } catch (problem) {
      toast.error(siteErrorText(t, problem))
    } finally {
      setSending(false)
    }
  }

  const lastRun = site.last_run
  // A change that stopped halfway continues from the parts already made.
  const continueChange = async () => {
    if (!lastRun) return
    setSending(true)
    try {
      await startRun(site.id, {
        kind: 'revise',
        request: lastRun.request || undefined,
        direction: lastRun.direction || undefined,
        variant: lastRun.variant || undefined,
      })
      await reload()
    } catch (problem) {
      toast.error(siteErrorText(t, problem))
    } finally {
      setSending(false)
    }
  }
  return (
    <Main fixed fluid className='gap-4'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
        <div className='space-y-1'>
          {header}
          <h1 className='text-2xl font-semibold tracking-tight'>{site.name}</h1>
          <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
            <Badge variant='secondary'>
              {t('siteBuilder.workspace.version', {
                number: site.current_version,
              })}
            </Badge>
            {site.published && site.live_url ? (
              <a
                href={site.live_url}
                target='_blank'
                rel='noreferrer'
                className='inline-flex items-center gap-1 text-emerald-600 underline-offset-4 hover:underline dark:text-emerald-400'
              >
                <Globe className='size-4' />
                {t('siteBuilder.workspace.onlineAt')}{' '}
                {site.live_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                <ExternalLink className='size-3' />
              </a>
            ) : null}
          </div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' onClick={() => setDialog('versions')}>
            <History className='size-4' />
            {t('siteBuilder.workspace.versions')}
          </Button>
          <Button
            variant='outline'
            onClick={() => setDialog('look')}
            disabled={busy}
          >
            <Palette className='size-4' />
            {t('siteBuilder.workspace.changeLook')}
          </Button>
          <Button onClick={() => setDialog('publish')} disabled={busy}>
            <Globe className='size-4' />
            {site.published
              ? t('siteBuilder.workspace.update')
              : t('siteBuilder.workspace.publish')}
          </Button>
        </div>
      </div>

      {intro ? (
        <div className='flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-base font-semibold'>
              {t('siteBuilder.workspace.introTitle')}
            </h2>
            <p className='text-sm text-muted-foreground'>
              {t('siteBuilder.workspace.introHelp')}
            </p>
          </div>
          <div className='flex shrink-0 flex-wrap gap-2'>
            <Button variant='outline' onClick={askForChange}>
              <Send className='size-4' />
              {t('siteBuilder.workspace.introAsk')}
            </Button>
            <Button onClick={() => setDialog('publish')}>
              <Globe className='size-4' />
              {t('siteBuilder.workspace.publish')}
            </Button>
          </div>
        </div>
      ) : null}

      <div className='flex min-h-0 flex-1 flex-col gap-4 lg:flex-row'>
        <aside
          className={
            intro
              ? 'hidden'
              : 'flex w-full shrink-0 flex-col gap-4 lg:w-96 lg:overflow-y-auto'
          }
        >
          <Card>
            <CardContent className='space-y-3'>
              <Label htmlFor='site-request'>
                {t('siteBuilder.workspace.reviseLabel')}
              </Label>
              <Textarea
                id='site-request'
                rows={4}
                maxLength={2000}
                value={request}
                disabled={busy}
                onChange={(event) => setRequest(event.target.value)}
                placeholder={t('siteBuilder.workspace.revisePlaceholder')}
                aria-describedby='site-request-help'
              />
              <p
                id='site-request-help'
                className='text-xs text-muted-foreground'
              >
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
                      {sending ? (
                        <Loader2 className='size-4 animate-spin' />
                      ) : null}
                      {t('siteBuilder.run.continue')}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </aside>

        <div className='order-first flex min-h-0 flex-1 flex-col lg:order-none'>
          <PreviewPane
            siteId={site.id}
            siteName={site.name}
            version={site.current_version}
            busy={busy}
          />
        </div>
      </div>

      <PublishDialog
        site={site}
        open={dialog === 'publish'}
        onOpenChange={(open) => setDialog(open ? 'publish' : null)}
        onChanged={() => void reload()}
      />
      <VersionsDialog
        site={site}
        open={dialog === 'versions'}
        onOpenChange={(open) => setDialog(open ? 'versions' : null)}
        busy={busy}
        onChanged={() => void reload()}
      />
      <LookDialog
        site={site}
        open={dialog === 'look'}
        onOpenChange={(open) => setDialog(open ? 'look' : null)}
        onStarted={() => void reload()}
      />
    </Main>
  )
}

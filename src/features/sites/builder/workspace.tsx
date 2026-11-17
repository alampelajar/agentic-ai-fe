import { useState, type ReactNode } from 'react'
import { ExternalLink, Globe, History, Palette, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import type { SiteDetail } from '../data/api'
import { LookDialog } from '../look-dialog'
import { PreviewPane } from '../preview-pane'
import { PublishDialog } from '../publish-dialog'
import { useRun } from '../use-run'
import { VersionsDialog } from '../versions-dialog'
import { CHANGE_REQUEST_ID, ChangePanel } from './change-panel'

type Dialog = 'publish' | 'versions' | 'look'

/** A site with a version: change it by chat, see the preview, publish. */
export function Workspace({
  site,
  header,
  reload,
}: {
  site: SiteDetail
  header: ReactNode
  reload: () => Promise<void>
}) {
  const { t } = useTranslation()
  const [dialog, setDialog] = useState<Dialog | null>(null)
  // A website seen for the first time opens on the preview, with one sentence of what to do.
  const [intro, setIntro] = useState(
    !site.published &&
      site.versions.length <= 1 &&
      site.active_run_id === undefined
  )
  const runId = site.active_run_id
  const { run, steps } = useRun(site.id, runId, (finished) => {
    if (finished.status === 'completed')
      toast.success(t('siteBuilder.toast.changeDone'))
    else if (finished.status === 'failed')
      toast.error(finished.error_message || t('siteBuilder.toast.runFailed'))
    void reload()
  })
  const busy = runId !== undefined

  const askForChange = () => {
    setIntro(false)
    window.setTimeout(
      () => document.getElementById(CHANGE_REQUEST_ID)?.focus(),
      0
    )
  }
  const dialogProps = (name: Dialog) => ({
    open: dialog === name,
    onOpenChange: (open: boolean) => setDialog(open ? name : null),
  })

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
              <LiveLink url={site.live_url} />
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
          <ChangePanel
            site={site}
            run={run}
            steps={steps}
            busy={busy}
            reload={reload}
          />
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
        {...dialogProps('publish')}
        onChanged={() => void reload()}
      />
      <VersionsDialog
        site={site}
        {...dialogProps('versions')}
        busy={busy}
        onChanged={() => void reload()}
      />
      <LookDialog
        site={site}
        {...dialogProps('look')}
        onStarted={() => void reload()}
      />
    </Main>
  )
}

/** "Online at name.example.com", opening the published website. */
function LiveLink({ url }: { url: string }) {
  const { t } = useTranslation()
  return (
    <a
      href={url}
      target='_blank'
      rel='noreferrer'
      className='inline-flex items-center gap-1 text-emerald-600 underline-offset-4 hover:underline dark:text-emerald-400'
    >
      <Globe className='size-4' />
      {t('siteBuilder.workspace.onlineAt')}{' '}
      {url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
      <ExternalLink className='size-3' />
    </a>
  )
}

import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Code,
  ExternalLink,
  Eye,
  GitCompare,
  Globe,
  History,
  MessageSquare,
  Palette,
  Rocket,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { LookDialog } from '../components/look-dialog'
import { PreviewPane } from '../components/preview-pane'
import { PublishDialog } from '../components/publish-dialog'
import { VersionsDialog } from '../components/versions-dialog'
import type { SiteDetail } from '../data/api'
import { useRun } from '../hooks/use-run'
import { BuildingState } from './building-state'
import { CodeView } from './code-view'
import { Conversation } from './conversation'

type Tab = 'preview' | 'code' | 'changes'
type Dialog = 'publish' | 'versions' | 'look'

/**
 * A website once its making has started: on the left what the AI is doing and the box
 * to ask for changes, on the right the website (or how far the making is), its code and
 * what the last change did.
 */
export function BuilderScreen({
  site,
  reload,
  onEdit,
}: {
  site: SiteDetail
  reload: () => Promise<void>
  onEdit: () => void
}) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('preview')
  const [dialog, setDialog] = useState<Dialog | null>(null)
  // Below the large width only one side shows at a time.
  const [side, setSide] = useState<'chat' | 'site'>('site')
  const busy = site.active_run_id !== undefined
  const runId = site.active_run_id ?? site.last_run?.id
  const { run, steps } = useRun(site.id, runId, (finished) => {
    // A run that had already ended when the page opened is only shown, not announced.
    if (site.active_run_id !== finished.id) return
    if (finished.status === 'completed') {
      toast.success(
        finished.kind === 'create'
          ? t('siteBuilder.toast.done')
          : t('siteBuilder.toast.changeDone')
      )
      setTab('preview')
      setSide('site')
    } else if (finished.status === 'failed')
      toast.error(finished.error_message || t('siteBuilder.toast.runFailed'))
    void reload()
  })
  const ready = site.has_version

  const dialogProps = (name: Dialog) => ({
    open: dialog === name,
    onOpenChange: (open: boolean) => setDialog(open ? name : null),
  })

  const tabs: { key: Tab; icon: ReactNode; label: string }[] = [
    {
      key: 'preview',
      icon: <Eye className='size-4' />,
      label: t('siteBuilder.screen.tabPreview'),
    },
    {
      key: 'code',
      icon: <Code className='size-4' />,
      label: t('siteBuilder.screen.tabCode'),
    },
    {
      key: 'changes',
      icon: <GitCompare className='size-4' />,
      label: t('siteBuilder.screen.tabChanges'),
    },
  ]

  return (
    <Main fixed fluid className='gap-3 py-3'>
      <header className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex min-w-0 items-center gap-2'>
          <Button variant='ghost' size='icon' asChild>
            <Link to='/sites' aria-label={t('siteBuilder.back')}>
              <ArrowLeft className='size-4' />
            </Link>
          </Button>
          <div className='min-w-0'>
            <h1 className='truncate text-base font-semibold'>{site.name}</h1>
            <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
              {ready ? (
                <Badge variant='secondary'>
                  {t('siteBuilder.workspace.version', {
                    number: site.current_version,
                  })}
                </Badge>
              ) : null}
              {site.published && site.live_url ? (
                <LiveLink url={site.live_url} />
              ) : null}
            </div>
          </div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setDialog('versions')}
            disabled={!ready}
          >
            <History className='size-4' />
            {t('siteBuilder.screen.history')}
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setDialog('look')}
            disabled={!ready || busy}
          >
            <Palette className='size-4' />
            {t('siteBuilder.workspace.changeLook')}
          </Button>
          <Button
            size='sm'
            onClick={() => setDialog('publish')}
            disabled={!ready || busy}
          >
            <Rocket className='size-4' />
            {site.published
              ? t('siteBuilder.workspace.update')
              : t('siteBuilder.workspace.publish')}
          </Button>
        </div>
      </header>

      <div
        role='group'
        aria-label={t('siteBuilder.screen.sides')}
        className='grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 lg:hidden'
      >
        {(
          [
            ['chat', <MessageSquare key='i' className='size-4' />],
            ['site', <Globe key='i' className='size-4' />],
          ] as const
        ).map(([key, icon]) => (
          <Button
            key={key}
            variant={side === key ? 'secondary' : 'ghost'}
            size='sm'
            aria-pressed={side === key}
            className={cn(side === key && 'bg-background')}
            onClick={() => setSide(key)}
          >
            {icon}
            {key === 'chat'
              ? t('siteBuilder.screen.sideChat')
              : t('siteBuilder.screen.sideSite')}
          </Button>
        ))}
      </div>

      <div className='flex min-h-0 flex-1 gap-3'>
        <aside
          aria-label={t('siteBuilder.screen.sideChat')}
          className={cn(
            'min-h-0 w-full flex-col overflow-hidden rounded-xl border bg-card lg:flex lg:w-96 lg:shrink-0',
            side === 'chat' ? 'flex' : 'hidden'
          )}
        >
          <Conversation
            site={site}
            run={run}
            steps={steps}
            busy={busy}
            reload={reload}
            onEdit={onEdit}
          />
        </aside>

        <section
          aria-label={t('siteBuilder.screen.sideSite')}
          className={cn(
            'min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card lg:flex',
            side === 'site' ? 'flex' : 'hidden'
          )}
        >
          <div
            role='tablist'
            aria-label={t('siteBuilder.screen.sideSite')}
            className='flex gap-1 overflow-x-auto border-b p-2'
          >
            {tabs.map((item) => (
              <Button
                key={item.key}
                role='tab'
                id={`site-tab-${item.key}`}
                aria-selected={tab === item.key}
                aria-controls='site-tab-panel'
                variant={tab === item.key ? 'secondary' : 'ghost'}
                size='sm'
                disabled={!ready}
                onClick={() => setTab(item.key)}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </div>
          <div
            id='site-tab-panel'
            role='tabpanel'
            aria-labelledby={`site-tab-${tab}`}
            className='flex min-h-0 flex-1 flex-col overflow-y-auto'
          >
            {!ready ? (
              <BuildingState
                site={site}
                run={run ?? site.last_run ?? null}
                steps={steps}
              />
            ) : tab === 'preview' ? (
              <PreviewPane
                siteId={site.id}
                siteName={site.name}
                version={site.current_version}
                busy={busy}
                bare
              />
            ) : (
              <CodeView
                key={tab}
                siteId={site.id}
                version={site.current_version}
                mode={tab}
              />
            )}
          </div>
        </section>
      </div>

      {ready ? (
        <>
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
            onStarted={() => {
              setSide('chat')
              void reload()
            }}
          />
        </>
      ) : null}
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
      className='inline-flex min-w-0 items-center gap-1 text-emerald-600 underline-offset-4 hover:underline dark:text-emerald-400'
    >
      <Globe className='size-4 shrink-0' />
      <span className='truncate'>
        {t('siteBuilder.workspace.onlineAt')}{' '}
        {url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
      </span>
      <ExternalLink className='size-3 shrink-0' />
    </a>
  )
}

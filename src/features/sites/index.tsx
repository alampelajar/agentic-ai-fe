import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowUp,
  ExternalLink,
  Globe,
  Loader2,
  PencilLine,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Main } from '@/components/layout/main'
import {
  createSite,
  deleteSite,
  getSitesAndPlan,
  type Plan,
  type Site,
} from './data/api'
import { siteErrorText } from './errors'
import { PlanUsage, planBlocksNewSite } from './plan-usage'
import { SiteStatus } from './site-status'

export function SitesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [sites, setSites] = useState<Site[]>([])
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Site | null>(null)
  const [removing, setRemoving] = useState(false)

  const load = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const loaded = await getSitesAndPlan()
      setSites(loaded.sites)
      setPlan(loaded.plan)
    } catch (error) {
      setLoadError(siteErrorText(t, error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = async () => {
    setCreating(true)
    setProblem(null)
    try {
      const site = await createSite(
        description.trim(),
        i18n.language.startsWith('en') ? 'en' : 'id'
      )
      await navigate({
        to: '/sites/$siteId',
        params: { siteId: String(site.id) },
      })
    } catch (error) {
      setProblem(siteErrorText(t, error))
      setCreating(false)
    }
  }

  const remove = async (site: Site) => {
    setRemoving(true)
    try {
      await deleteSite(site.id)
      toast.success(t('siteBuilder.toast.deleted'))
      setDeleting(null)
      await load()
    } catch (error) {
      toast.error(siteErrorText(t, error))
    } finally {
      setRemoving(false)
    }
  }

  const examples = [1, 2, 3].map((number) => ({
    label: t(`siteBuilder.example${number}Short`),
    text: t(`siteBuilder.example${number}`),
  }))
  const blocked = planBlocksNewSite(plan)
  const canStart = !creating && !blocked && description.trim().length >= 10
  let blockedText: string | null = null
  if (plan && blocked) {
    blockedText =
      plan.sites_used >= plan.site_limit
        ? t('siteBuilder.plan.siteLimitReached', { limit: plan.site_limit })
        : t('siteBuilder.plan.allowanceUsed', {
            date: new Date(plan.resets_at).toLocaleDateString(i18n.language, {
              day: 'numeric',
              month: 'long',
            }),
          })
  }

  return (
    <Main className='space-y-12'>
      <section className='mx-auto flex w-full max-w-3xl flex-col items-center gap-6 pt-6 text-center sm:pt-16'>
        <div className='space-y-2'>
          <p className='inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground'>
            <Sparkles className='size-4' />
            {t('siteBuilder.eyebrow')}
          </p>
          <h1 className='text-2xl font-semibold tracking-tight sm:text-3xl'>
            {t('siteBuilder.describeLabel')}
          </h1>
          <p className='mx-auto max-w-xl text-sm text-muted-foreground'>
            {t('siteBuilder.subtitle')}
          </p>
        </div>

        <form
          className='w-full rounded-xl border bg-card text-left transition-colors focus-within:border-ring'
          onSubmit={(event) => {
            event.preventDefault()
            if (canStart) void start()
          }}
        >
          <Label htmlFor='site-description' className='sr-only'>
            {t('siteBuilder.describeLabel')}
          </Label>
          <Textarea
            id='site-description'
            rows={4}
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onKeyDown={(event) => {
              // Ctrl+Enter (or Cmd+Enter) starts, Enter alone adds a new line.
              if (
                event.key === 'Enter' &&
                (event.ctrlKey || event.metaKey) &&
                canStart
              ) {
                event.preventDefault()
                void start()
              }
            }}
            placeholder={t('siteBuilder.describePlaceholder')}
            aria-describedby='site-description-help'
            className='min-h-32 resize-none border-0 bg-transparent px-4 py-3 shadow-none focus-visible:ring-0 dark:bg-transparent'
          />
          <div className='flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
            <p
              id='site-description-help'
              className='text-xs text-muted-foreground'
            >
              {t('siteBuilder.describeHelp')}
            </p>
            <Button
              type='submit'
              className='shrink-0 self-end sm:self-auto'
              disabled={!canStart}
            >
              {creating ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <ArrowUp className='size-4' />
              )}
              {creating ? t('siteBuilder.starting') : t('siteBuilder.start')}
            </Button>
          </div>
        </form>

        <div className='flex w-full flex-col items-center gap-2'>
          <p className='text-xs text-muted-foreground'>
            {t('siteBuilder.examplesLabel')}
          </p>
          <div className='flex flex-wrap justify-center gap-2'>
            {examples.map((example) => (
              <Button
                key={example.label}
                type='button'
                variant='outline'
                size='sm'
                className='rounded-full font-normal'
                onClick={() => {
                  setDescription(example.text)
                  document.getElementById('site-description')?.focus()
                }}
              >
                <PencilLine className='size-4' />
                {example.label}
              </Button>
            ))}
          </div>
        </div>

        {problem ? (
          <p role='alert' className='text-sm text-destructive'>
            {problem}
          </p>
        ) : null}
        {blockedText ? (
          <p
            role='status'
            className='rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400'
          >
            {blockedText}
          </p>
        ) : null}
      </section>

      {plan ? <PlanUsage plan={plan} /> : null}

      <section className='space-y-4'>
        <h2 className='text-base font-semibold'>
          {t('siteBuilder.yourSites')}
        </h2>
        {loading ? (
          <p className='flex items-center gap-2 text-sm text-muted-foreground'>
            <Loader2 className='size-4 animate-spin' />
            {t('siteBuilder.loading')}
          </p>
        ) : loadError ? (
          <Card role='alert'>
            <CardContent className='py-10 text-center'>
              <p className='font-medium'>{t('siteBuilder.errorTitle')}</p>
              <p className='mt-1 text-sm text-muted-foreground'>{loadError}</p>
              <Button
                className='mt-4'
                variant='outline'
                onClick={() => void load()}
              >
                {t('siteBuilder.retry')}
              </Button>
            </CardContent>
          </Card>
        ) : sites.length === 0 ? (
          <div className='rounded-xl border border-dashed p-10 text-center'>
            <Globe className='mx-auto mb-3 size-8 text-muted-foreground' />
            <p className='font-medium'>{t('siteBuilder.emptyTitle')}</p>
            <p className='mx-auto mt-1 max-w-md text-sm text-muted-foreground'>
              {t('siteBuilder.emptyDescription')}
            </p>
            <Button
              className='mt-4'
              variant='outline'
              onClick={() =>
                document.getElementById('site-description')?.focus()
              }
            >
              {t('siteBuilder.describeLabel')}
            </Button>
          </div>
        ) : (
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            {sites.map((site) => (
              <Card key={site.id} className='gap-0 py-0'>
                <CardContent className='flex h-full flex-col gap-3 p-5'>
                  <div className='flex items-start justify-between gap-3'>
                    <h3 className='text-base font-semibold'>{site.name}</h3>
                    <SiteStatus site={site} />
                  </div>
                  <p className='line-clamp-2 text-sm text-muted-foreground'>
                    {site.description}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {t('siteBuilder.updated', {
                      date: new Date(site.updated_at).toLocaleString(
                        i18n.language
                      ),
                    })}
                  </p>
                  {site.published && site.live_url ? (
                    <a
                      href={site.live_url}
                      target='_blank'
                      rel='noreferrer'
                      className='inline-flex w-fit items-center gap-1 text-sm text-emerald-600 underline-offset-4 hover:underline dark:text-emerald-400'
                    >
                      <ExternalLink className='size-4' />
                      {t('siteBuilder.visit')}
                    </a>
                  ) : null}
                  <div className='mt-auto flex flex-wrap gap-2 border-t pt-3'>
                    <Button size='sm' asChild>
                      <Link
                        to='/sites/$siteId'
                        params={{ siteId: String(site.id) }}
                      >
                        {t('siteBuilder.open')}
                      </Link>
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='text-destructive'
                      onClick={() => setDeleting(site)}
                    >
                      <Trash2 className='size-4' />
                      {t('siteBuilder.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('siteBuilder.deleteTitle')}
        desc={t('siteBuilder.deleteDesc', { name: deleting?.name ?? '' })}
        confirmText={t('siteBuilder.delete')}
        cancelBtnText={t('siteBuilder.publish.close')}
        destructive
        isLoading={removing}
        handleConfirm={() => deleting && void remove(deleting)}
      />
    </Main>
  )
}

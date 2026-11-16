import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
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
import { createSite, deleteSite, getSites, type Site } from './data/api'
import { siteErrorText } from './errors'
import { SiteStatus } from './site-status'

export function SitesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [sites, setSites] = useState<Site[]>([])
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
      setSites(await getSites())
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

  const examples = [
    t('siteBuilder.example1'),
    t('siteBuilder.example2'),
    t('siteBuilder.example3'),
  ]
  const length = description.trim().length

  return (
    <Main className='space-y-6'>
      <div className='border-b pb-6'>
        <p className='text-sm text-muted-foreground'>
          {t('siteBuilder.eyebrow')}
        </p>
        <h1 className='text-2xl font-semibold tracking-tight'>
          {t('siteBuilder.title')}
        </h1>
        <p className='mt-1 max-w-2xl text-sm text-muted-foreground'>
          {t('siteBuilder.subtitle')}
        </p>
      </div>

      <Card>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label
              htmlFor='site-description'
              className='text-base font-semibold'
            >
              {t('siteBuilder.describeLabel')}
            </Label>
            <Textarea
              id='site-description'
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('siteBuilder.describePlaceholder')}
              aria-describedby='site-description-help'
            />
            <p
              id='site-description-help'
              className='text-xs text-muted-foreground'
            >
              {t('siteBuilder.describeHelp')}
            </p>
          </div>
          <div className='space-y-2'>
            <p className='text-xs text-muted-foreground'>
              {t('siteBuilder.examplesLabel')}
            </p>
            <div className='grid gap-2 md:grid-cols-3'>
              {examples.map((example) => (
                <Button
                  key={example}
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-full w-full items-start justify-start py-2 text-left font-normal whitespace-normal'
                  onClick={() => setDescription(example)}
                >
                  <PencilLine className='size-4' />
                  {example}
                </Button>
              ))}
            </div>
          </div>
          {problem ? (
            <p role='alert' className='text-sm text-destructive'>
              {problem}
            </p>
          ) : null}
          <div className='flex justify-end'>
            <Button
              onClick={() => void start()}
              disabled={creating || length < 10}
            >
              {creating ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Sparkles className='size-4' />
              )}
              {creating ? t('siteBuilder.starting') : t('siteBuilder.start')}
            </Button>
          </div>
        </CardContent>
      </Card>

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

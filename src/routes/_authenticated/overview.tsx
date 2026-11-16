import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { CircleAlert, Globe, Loader2, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Main } from '@/components/layout/main'
import { SiteStatus } from '@/features/sites'
import { getSites, type Site } from '@/features/sites/data/api'
import { siteErrorText } from '@/features/sites/errors'

export const Route = createFileRoute('/_authenticated/overview')({
  component: Overview,
})

const RECENT = 5

/** The person's websites at a glance: how many, which are online, which are being made. */
function Overview() {
  const { t, i18n } = useTranslation()
  const [sites, setSites] = useState<Site[] | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const load = useCallback(async () => {
    setProblem(null)
    try {
      setSites(await getSites())
    } catch (error) {
      setProblem(siteErrorText(t, error))
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const recent = [...(sites ?? [])]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, RECENT)
  const online = sites?.filter((site) => site.published).length ?? 0
  const building =
    sites?.filter((site) => site.status === 'building').length ?? 0

  return (
    <Main className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {t('overviewPage.title')}
          </h1>
          <p className='text-sm text-muted-foreground'>
            {t('overviewPage.subtitle')}
          </p>
        </div>
        <Button asChild>
          <Link to='/sites'>
            <Plus className='size-4' />
            {t('overviewPage.make')}
          </Link>
        </Button>
      </div>

      {problem ? (
        <div
          role='alert'
          className='flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between'
        >
          <p className='flex items-start gap-2'>
            <CircleAlert className='mt-0.5 size-4 shrink-0' />
            {t('overviewPage.loadError')} {problem}
          </p>
          <Button variant='outline' size='sm' onClick={() => void load()}>
            {t('overviewPage.retry')}
          </Button>
        </div>
      ) : null}

      <div className='grid gap-4 sm:grid-cols-3'>
        <Stat label={t('overviewPage.total')} value={sites?.length} />
        <Stat
          label={t('overviewPage.online')}
          value={sites ? online : undefined}
          icon={
            <Globe className='size-4 text-emerald-600 dark:text-emerald-400' />
          }
        />
        <Stat
          label={t('overviewPage.building')}
          value={sites ? building : undefined}
          icon={
            building > 0 ? (
              <Loader2 className='size-4 animate-spin text-muted-foreground' />
            ) : null
          }
        />
      </div>

      <section className='space-y-3'>
        <div className='flex items-center justify-between gap-2'>
          <h2 className='text-base font-semibold'>
            {t('overviewPage.recent')}
          </h2>
          {sites && sites.length > RECENT ? (
            <Link
              to='/sites'
              className='text-sm text-primary underline-offset-4 hover:underline'
            >
              {t('overviewPage.seeAll')}
            </Link>
          ) : null}
        </div>

        {sites === null && !problem ? (
          <div className='space-y-2' aria-busy='true'>
            <Skeleton className='h-16 w-full' />
            <Skeleton className='h-16 w-full' />
          </div>
        ) : sites !== null && sites.length === 0 ? (
          <div className='flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center'>
            <Globe className='size-6 text-muted-foreground' />
            <div>
              <p className='text-base font-semibold'>
                {t('overviewPage.emptyTitle')}
              </p>
              <p className='text-sm text-muted-foreground'>
                {t('overviewPage.emptyText')}
              </p>
            </div>
            <Button asChild>
              <Link to='/sites'>{t('overviewPage.make')}</Link>
            </Button>
          </div>
        ) : (
          <ul className='space-y-2'>
            {recent.map((site) => (
              <li key={site.id}>
                <Link
                  to='/sites/$siteId'
                  params={{ siteId: String(site.id) }}
                  className='flex flex-col gap-1 rounded-lg border bg-card p-4 transition-colors hover:bg-accent sm:flex-row sm:items-center sm:justify-between'
                >
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-medium'>{site.name}</p>
                    <p className='text-xs text-muted-foreground'>
                      {t('overviewPage.updated', {
                        date: new Date(site.updated_at).toLocaleString(
                          i18n.language
                        ),
                      })}
                    </p>
                  </div>
                  <SiteStatus site={site} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Main>
  )
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string
  value: number | undefined
  icon?: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className='space-y-1'>
        <p className='flex items-center gap-2 text-xs text-muted-foreground'>
          {icon}
          {label}
        </p>
        {value === undefined ? (
          <Skeleton className='h-8 w-12' />
        ) : (
          <p className='text-2xl font-semibold tracking-tight'>{value}</p>
        )}
      </CardContent>
    </Card>
  )
}

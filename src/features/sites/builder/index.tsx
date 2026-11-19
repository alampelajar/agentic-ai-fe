import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Main } from '@/components/layout/main'
import { getSite, type SiteDetail } from '../data/api'
import { siteErrorText } from '../errors'
import { SetupWizard } from '../setup-wizard'
import { BuilderScreen } from './screen'

export function SiteBuilderRoute() {
  const { siteId } = useParams({ from: '/_authenticated/sites/$siteId' })
  return <SiteBuilder key={siteId} siteId={Number(siteId)} />
}

/**
 * One website, in the stage it is in: the questions before the first run, then the
 * screen with the AI's work on the left and the website on the right.
 */
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

  return (
    <BuilderScreen site={site} reload={load} onEdit={() => setEditing(true)} />
  )
}

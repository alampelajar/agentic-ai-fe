import { Cloud, MonitorCog } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DesktopConnectionCard, LocalFoldersCard } from '@/features/desktop-runtime/connection-card'
import { DesktopRuntime } from '@/features/desktop-runtime'
import { GitHubCard } from './github-card'

// Placeholders only: the real token is something the user chooses and keeps private.
const START_COMMANDS = `$env:LOCAL_RUNNER_TOKEN = "<a long random secret>"
$env:LOCAL_RUNNER_ADDR = "127.0.0.1:8765"
$env:LOCAL_RUNNER_ALLOWED_ORIGINS = "http://localhost:5173"
go run ./cmd/local-runner`

const DESKTOP_COMMANDS = `$env:LOCAL_RUNNER_DESKTOP_ENABLED = "true"
$env:LOCAL_RUNNER_DESKTOP_SIDECAR_COMMAND = "<python 3.11 environment> desktop_sidecar.py"`

/**
 * Settings → Integrations. Today it holds one optional integration, the Desktop
 * Runtime. Cloud Workspaces are not configured here and need none of it.
 */
export function IntegrationsPage() {
  const { t } = useTranslation()
  const cloudItems = t('desktopRuntime.compare.cloud.items', { returnObjects: true }) as string[]
  const desktopItems = t('desktopRuntime.compare.desktop.items', { returnObjects: true }) as string[]
  const troubleshooting = t('desktopRuntime.troubleshooting.items', { returnObjects: true }) as string[]

  return (
    <div className='space-y-8'>
      <div>
        <h2 className='text-xl font-semibold'>{t('desktopRuntime.pageTitle')}</h2>
        <p className='text-sm text-muted-foreground'>{t('desktopRuntime.pageSubtitle')}</p>
      </div>

      <GitHubCard />

      <section aria-labelledby='desktop-runtime-heading' className='space-y-4'>
        <div className='flex flex-wrap items-center gap-2'>
          <MonitorCog className='size-5' />
          <h3 id='desktop-runtime-heading' className='text-lg font-semibold'>{t('desktopRuntime.title')}</h3>
          <Badge variant='outline'>{t('desktopRuntime.optional')}</Badge>
        </div>
        <p className='max-w-3xl text-sm' data-testid='runtime-summary'>{t('desktopRuntime.summary')}</p>

        <div className='grid gap-4 md:grid-cols-2'>
          <Card data-testid='compare-cloud'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'><Cloud className='size-4' />{t('desktopRuntime.compare.cloud.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className='list-disc space-y-1 pl-5 text-sm'>{cloudItems.map((item) => <li key={item}>{item}</li>)}</ul>
            </CardContent>
          </Card>
          <Card data-testid='compare-desktop'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'><MonitorCog className='size-4' />{t('desktopRuntime.compare.desktop.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className='list-disc space-y-1 pl-5 text-sm'>{desktopItems.map((item) => <li key={item}>{item}</li>)}</ul>
            </CardContent>
          </Card>
        </div>

        <DesktopConnectionCard />
        <LocalFoldersCard />
        <DesktopRuntime />

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>{t('desktopRuntime.guide.title')}</CardTitle>
            <CardDescription>{t('desktopRuntime.guide.intro')}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <ol className='list-decimal space-y-3 pl-5'>
              <li>{t('desktopRuntime.guide.step1')}</li>
              <li>
                {t('desktopRuntime.guide.step2')}
                <pre className='mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs'>{START_COMMANDS}</pre>
              </li>
              <li>
                {t('desktopRuntime.guide.step3')}
                <pre className='mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs'>{DESKTOP_COMMANDS}</pre>
              </li>
              <li>{t('desktopRuntime.guide.step4')}</li>
            </ol>
            <p className='text-muted-foreground'>{t('desktopRuntime.guide.docs')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>{t('desktopRuntime.troubleshooting.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className='list-disc space-y-2 pl-5 text-sm'>{troubleshooting.map((item) => <li key={item}>{item}</li>)}</ul>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

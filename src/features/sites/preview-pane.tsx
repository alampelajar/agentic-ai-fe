import { useCallback, useEffect, useState } from 'react'
import {
  ExternalLink,
  Loader2,
  Monitor,
  RotateCw,
  Smartphone,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getPreview } from './data/api'
import { siteErrorText } from './errors'

type PreviewPaneProps = {
  siteId: number
  siteName: string
  /** Changes when a new version is shown, so the frame loads it. */
  version: number
  busy: boolean
}

// A preview address works for two hours; asking again every 10 minutes keeps the
// preview running and the address fresh.
const REFRESH_MS = 10 * 60 * 1000

export function PreviewPane({
  siteId,
  siteName,
  version,
  busy,
}: PreviewPaneProps) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [phone, setPhone] = useState(false)
  const [reloads, setReloads] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const preview = await getPreview(siteId)
      setUrl(preview.url)
      setError(null)
    } catch (problem) {
      setError(siteErrorText(t, problem))
    }
  }, [siteId, t])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [refresh, version])

  return (
    <section
      aria-label={t('siteBuilder.preview.title')}
      className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card'
    >
      <div className='flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2'>
        <h2 className='text-sm font-semibold'>
          {t('siteBuilder.preview.title')}
        </h2>
        <div className='flex items-center gap-1'>
          <Button
            variant={phone ? 'ghost' : 'secondary'}
            size='icon'
            aria-label={t('siteBuilder.preview.desktop')}
            aria-pressed={!phone}
            onClick={() => setPhone(false)}
          >
            <Monitor className='size-4' />
          </Button>
          <Button
            variant={phone ? 'secondary' : 'ghost'}
            size='icon'
            aria-label={t('siteBuilder.preview.phone')}
            aria-pressed={phone}
            onClick={() => setPhone(true)}
          >
            <Smartphone className='size-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            aria-label={t('siteBuilder.preview.reload')}
            onClick={() => setReloads((count) => count + 1)}
            disabled={!url}
          >
            <RotateCw className='size-4' />
          </Button>
          {url ? (
            <Button variant='ghost' size='icon' asChild>
              <a
                href={url}
                target='_blank'
                rel='noreferrer'
                aria-label={t('siteBuilder.preview.openNew')}
              >
                <ExternalLink className='size-4' />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
      {busy ? (
        <p className='border-b bg-muted px-3 py-2 text-xs text-muted-foreground'>
          {t('siteBuilder.preview.updating')}
        </p>
      ) : null}
      <div className='flex min-h-96 flex-1 justify-center overflow-auto bg-muted p-2 sm:p-4'>
        {error ? (
          <div role='alert' className='m-auto max-w-sm text-center'>
            <p className='text-sm font-medium'>
              {t('siteBuilder.preview.error')}
            </p>
            <p className='mt-1 text-sm text-muted-foreground'>{error}</p>
            <Button
              className='mt-3'
              variant='outline'
              size='sm'
              onClick={() => void refresh()}
            >
              {t('siteBuilder.retry')}
            </Button>
          </div>
        ) : url ? (
          <iframe
            key={`${url}-${version}-${reloads}`}
            src={url}
            title={t('siteBuilder.preview.frameTitle', { name: siteName })}
            sandbox='allow-scripts allow-forms allow-same-origin allow-popups'
            className={cn(
              'h-full min-h-96 rounded-md border bg-background transition-all',
              phone ? 'w-96 max-w-full' : 'w-full'
            )}
          />
        ) : (
          <p className='m-auto flex items-center gap-2 text-sm text-muted-foreground'>
            <Loader2 className='size-4 animate-spin' />
            {t('siteBuilder.preview.loading')}
          </p>
        )}
      </div>
    </section>
  )
}

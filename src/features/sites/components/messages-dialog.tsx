import { useCallback, useEffect, useState } from 'react'
import { Inbox, Loader2, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getSiteMessages, type SiteDetail, type SiteMessage } from '../data/api'
import { siteErrorText } from '../lib/errors'

type Loaded =
  | { state: 'loading' }
  | { state: 'error'; text: string }
  | { state: 'ready'; messages: SiteMessage[]; test: boolean }

/** "rsvp" or "booking-form" as a person would write it. */
function plain(name: string): string {
  const text = name.replace(/[-_]+/g, ' ').trim()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** What visitors sent through the website's forms, newest first. */
export function MessagesDialog({
  site,
  open,
  onOpenChange,
}: {
  site: SiteDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t, i18n } = useTranslation()
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })

  const load = useCallback(() => {
    setLoaded({ state: 'loading' })
    getSiteMessages(site.id)
      .then((result) => setLoaded({ state: 'ready', ...result }))
      .catch((error: unknown) =>
        setLoaded({ state: 'error', text: siteErrorText(t, error) })
      )
  }, [site.id, t])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const when = (at: string) =>
    // SQLite writes UTC as "2026-11-24 02:15:00".
    new Date(at.replace(' ', 'T') + 'Z').toLocaleString(i18n.language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-screen overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t('siteBuilder.messages.title')}</DialogTitle>
          <DialogDescription>
            {t('siteBuilder.messages.help')}
          </DialogDescription>
        </DialogHeader>

        {loaded.state === 'loading' ? (
          <p className='flex items-center gap-2 text-sm text-muted-foreground'>
            <Loader2 className='size-4 animate-spin' />
            {t('siteBuilder.messages.loading')}
          </p>
        ) : loaded.state === 'error' ? (
          <div role='alert' className='space-y-3 rounded-lg border p-4'>
            <p className='text-sm font-medium'>
              {t('siteBuilder.messages.error')}
            </p>
            <p className='text-sm text-muted-foreground'>{loaded.text}</p>
            <Button variant='outline' size='sm' onClick={load}>
              {t('siteBuilder.retry')}
            </Button>
          </div>
        ) : loaded.messages.length === 0 ? (
          <div className='rounded-xl border border-dashed p-8 text-center'>
            <Inbox className='mx-auto mb-3 size-8 text-muted-foreground' />
            <p className='font-medium'>
              {t('siteBuilder.messages.emptyTitle')}
            </p>
            <p className='mx-auto mt-1 max-w-sm text-sm text-muted-foreground'>
              {loaded.test
                ? t('siteBuilder.messages.emptyHelpTest')
                : t('siteBuilder.messages.emptyHelp')}
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            <div className='flex items-center justify-between gap-2'>
              <p className='text-xs text-muted-foreground'>
                {loaded.test
                  ? t('siteBuilder.messages.testNote')
                  : t('siteBuilder.messages.count', {
                      count: loaded.messages.length,
                    })}
              </p>
              <Button variant='ghost' size='sm' onClick={load}>
                <RefreshCw className='size-4' />
                {t('siteBuilder.messages.refresh')}
              </Button>
            </div>
            <ul className='space-y-3'>
              {loaded.messages.map((message) => (
                <li key={message.id} className='rounded-lg border p-4'>
                  <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
                    <p className='text-sm font-semibold'>
                      {plain(message.form)}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {when(message.at)}
                    </p>
                  </div>
                  <dl className='grid gap-x-4 gap-y-1 text-sm sm:grid-cols-3'>
                    {message.fields.map((field) => (
                      <div key={field.name} className='contents'>
                        <dt className='text-muted-foreground'>
                          {plain(field.name)}
                        </dt>
                        <dd className='break-words whitespace-pre-wrap sm:col-span-2'>
                          {field.value || '-'}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

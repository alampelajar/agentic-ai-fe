import { useEffect, useState } from 'react'
import {
  CircleAlert,
  CircleCheck,
  Copy,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  checkSlug,
  publishSite,
  unpublishSite,
  type SiteDetail,
} from '../data/api'
import { siteErrorText } from '../lib/errors'
import { ShareWebsite } from './share-website'

type PublishDialogProps = {
  site: SiteDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

type Check = {
  state: 'idle' | 'checking' | 'ok' | 'problem'
  text: string
  url: string
}

export function PublishDialog({
  site,
  open,
  onOpenChange,
  onChanged,
}: PublishDialogProps) {
  const { t } = useTranslation()
  const [slug, setSlug] = useState(site.slug ?? site.suggested_slug)
  const [check, setCheck] = useState<Check>({
    state: 'idle',
    text: '',
    url: '',
  })
  const [busy, setBusy] = useState(false)
  const [published, setPublished] = useState<string | null>(null)
  const [confirmOff, setConfirmOff] = useState(false)

  useEffect(() => {
    if (!open) return
    const value = slug.trim().toLowerCase()
    if (!value) return
    let current = true
    const timer = window.setTimeout(async () => {
      setCheck((previous) => ({ ...previous, state: 'checking' }))
      try {
        const result = await checkSlug(site.id, value)
        if (!current) return
        setCheck(
          result.available
            ? {
                state: 'ok',
                text: t('siteBuilder.publish.available'),
                url: result.url,
              }
            : {
                state: 'problem',
                text: t(`siteBuilder.errors.${result.code}`),
                url: result.url,
              }
        )
      } catch (error) {
        if (current)
          setCheck({ state: 'problem', text: siteErrorText(t, error), url: '' })
      }
    }, 400)
    return () => {
      current = false
      window.clearTimeout(timer)
    }
  }, [slug, open, site.id, t])

  const publish = async () => {
    setBusy(true)
    try {
      const result = await publishSite(site.id, slug.trim().toLowerCase())
      setPublished(result.url)
      toast.success(t('siteBuilder.toast.published'))
      onChanged()
    } catch (error) {
      toast.error(siteErrorText(t, error))
    } finally {
      setBusy(false)
    }
  }

  const takeOffline = async () => {
    setBusy(true)
    try {
      await unpublishSite(site.id)
      toast.success(t('siteBuilder.toast.unpublished'))
      setConfirmOff(false)
      onOpenChange(false)
      onChanged()
    } catch (error) {
      toast.error(siteErrorText(t, error))
    } finally {
      setBusy(false)
    }
  }

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('siteBuilder.toast.copied'))
    } catch {
      toast.error(t('siteBuilder.errors.unknown'))
    }
  }

  const upToDate =
    site.published && site.published_version === site.current_version

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setPublished(null)
          onOpenChange(next)
        }}
      >
        <DialogContent className='sm:max-w-lg'>
          {published ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {t('siteBuilder.publish.successTitle')}
                </DialogTitle>
                <DialogDescription>
                  {t('siteBuilder.publish.successHelp')}
                </DialogDescription>
              </DialogHeader>
              <p className='rounded-md border bg-muted px-3 py-2 text-sm break-all'>
                {published}
              </p>
              <ShareWebsite url={published} name={site.name} />
              <DialogFooter className='gap-2'>
                <Button variant='outline' onClick={() => void copy(published)}>
                  <Copy className='size-4' />
                  {t('siteBuilder.publish.copy')}
                </Button>
                <Button asChild>
                  <a href={published} target='_blank' rel='noreferrer'>
                    <ExternalLink className='size-4' />
                    {t('siteBuilder.visit')}
                  </a>
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>
                  {site.published
                    ? t('siteBuilder.publish.updateTitle')
                    : t('siteBuilder.publish.title')}
                </DialogTitle>
                <DialogDescription>
                  {site.published
                    ? upToDate
                      ? t('siteBuilder.publish.upToDate')
                      : t('siteBuilder.publish.updateHelp', {
                          published: site.published_version,
                          current: site.current_version,
                        })
                    : t('siteBuilder.publish.help')}
                </DialogDescription>
              </DialogHeader>
              <p className='rounded-md border bg-muted/50 p-3 text-sm'>
                {t('siteBuilder.publish.versionNote', {
                  number: site.current_version,
                })}{' '}
                <button
                  type='button'
                  className='font-medium text-primary underline-offset-4 hover:underline'
                  onClick={() => onOpenChange(false)}
                >
                  {t('siteBuilder.publish.seeFirst')}
                </button>
              </p>
              <div className='space-y-2'>
                <Label htmlFor='site-slug'>
                  {t('siteBuilder.publish.addressLabel')}
                </Label>
                <Input
                  id='site-slug'
                  value={slug}
                  maxLength={40}
                  autoComplete='off'
                  spellCheck={false}
                  aria-describedby='site-slug-help site-slug-check'
                  onChange={(event) =>
                    setSlug(
                      event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, '')
                    )
                  }
                />
                <p
                  id='site-slug-help'
                  className='text-xs text-muted-foreground'
                >
                  {t('siteBuilder.publish.addressHelp')}
                </p>
                <div
                  id='site-slug-check'
                  aria-live='polite'
                  className='min-h-5 text-sm'
                >
                  {check.state === 'checking' ? (
                    <span className='flex items-center gap-2 text-muted-foreground'>
                      <Loader2 className='size-4 animate-spin' />
                      {t('siteBuilder.publish.checking')}
                    </span>
                  ) : check.state === 'ok' ? (
                    <span className='flex flex-wrap items-center gap-2 text-emerald-600 dark:text-emerald-400'>
                      <CircleCheck className='size-4' />
                      {check.text}
                      <span className='text-xs break-all text-muted-foreground'>
                        {check.url}
                      </span>
                    </span>
                  ) : check.state === 'problem' ? (
                    <span className='flex items-center gap-2 text-destructive'>
                      <CircleAlert className='size-4' />
                      {check.text}
                    </span>
                  ) : null}
                </div>
              </div>
              <DialogFooter className='gap-2 sm:justify-between'>
                {site.published ? (
                  <Button
                    variant='ghost'
                    className='text-destructive'
                    onClick={() => setConfirmOff(true)}
                    disabled={busy}
                  >
                    {t('siteBuilder.publish.unpublish')}
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  onClick={() => void publish()}
                  disabled={
                    busy ||
                    check.state !== 'ok' ||
                    (upToDate && site.slug === slug)
                  }
                >
                  {busy ? <Loader2 className='size-4 animate-spin' /> : null}
                  {busy
                    ? t('siteBuilder.publish.publishing')
                    : site.published
                      ? t('siteBuilder.workspace.update')
                      : t('siteBuilder.publish.publish')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmOff}
        onOpenChange={setConfirmOff}
        title={t('siteBuilder.publish.unpublishTitle')}
        desc={t('siteBuilder.publish.unpublishDesc')}
        confirmText={t('siteBuilder.publish.unpublish')}
        cancelBtnText={t('siteBuilder.publish.close')}
        destructive
        isLoading={busy}
        handleConfirm={() => void takeOffline()}
      />
    </>
  )
}

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
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
import { startRun, type SiteDetail, type SiteImage } from '../data/api'
import { siteErrorText } from '../lib/errors'
import { ImagePicker } from '../setup-wizard/image-picker'

/**
 * Photos and the logo after the website is made. Uploading only keeps them; "Use on
 * my website" asks for the change that puts them on the pages.
 */
export function PhotosDialog({
  site,
  open,
  onOpenChange,
  busy,
  onStarted,
}: {
  site: SiteDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  busy: boolean
  onStarted: () => void
}) {
  const { t } = useTranslation()
  const [images, setImages] = useState<SiteImage[]>(site.images ?? [])
  const [starting, setStarting] = useState(false)
  // Pictures added or removed in this dialog, so "Use" is offered only after a change.
  const [changed, setChanged] = useState(false)
  const occasion = ['wedding', 'event', 'engagement', 'anniversary'].includes(
    site.kind ?? ''
  )

  const use = async () => {
    setStarting(true)
    try {
      await startRun(site.id, {
        kind: 'revise',
        request: t('siteBuilder.photos.request'),
      })
      setChanged(false)
      onOpenChange(false)
      onStarted()
    } catch (error) {
      toast.error(siteErrorText(t, error))
    } finally {
      setStarting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-screen overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t('siteBuilder.photos.title')}</DialogTitle>
          <DialogDescription>{t('siteBuilder.photos.help')}</DialogDescription>
        </DialogHeader>
        <ImagePicker
          siteId={site.id}
          images={images}
          onChange={(next) => {
            setImages(next)
            setChanged(true)
          }}
          occasion={occasion}
        />
        <DialogFooter className='gap-2'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('siteBuilder.publish.close')}
          </Button>
          <Button
            onClick={() => void use()}
            disabled={!changed || busy || starting || images.length === 0}
          >
            {starting ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Sparkles className='size-4' />
            )}
            {t('siteBuilder.photos.use')}
          </Button>
        </DialogFooter>
        {busy ? (
          <p className='text-xs text-muted-foreground'>
            {t('siteBuilder.photos.busy')}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

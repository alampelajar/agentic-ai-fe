import { useState } from 'react'
import { ExternalLink, Monitor, Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Direction } from '../data/api'

type ExampleDialogProps = {
  direction: Direction | null
  onOpenChange: (open: boolean) => void
  onChoose: (direction: Direction) => void
}

/** A look's example website, large, at computer or phone width, before it is chosen. */
export function ExampleDialog({
  direction,
  onOpenChange,
  onChoose,
}: ExampleDialogProps) {
  const { t } = useTranslation()
  const [phone, setPhone] = useState(false)
  // The example is shown in the colours this site gets, when they differ from the look's own.
  const address = direction
    ? `${direction.sample_url}${direction.variant ? `?warna=${encodeURIComponent(direction.variant)}` : ''}`
    : ''

  return (
    <Dialog open={direction !== null} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-screen max-h-screen w-screen max-w-none flex-col gap-3 sm:h-5/6 sm:w-11/12 sm:max-w-6xl'>
        {direction ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {t('siteBuilder.look.exampleTitle', { name: direction.name })}
              </DialogTitle>
              <DialogDescription>
                {t('siteBuilder.look.exampleHelp')}{' '}
                {direction.variant_name
                  ? t('siteBuilder.look.exampleColour', {
                      name: direction.variant_name,
                    })
                  : null}
              </DialogDescription>
            </DialogHeader>
            <div className='flex items-center justify-end gap-1'>
              <Button
                variant={phone ? 'ghost' : 'secondary'}
                size='sm'
                aria-pressed={!phone}
                onClick={() => setPhone(false)}
              >
                <Monitor className='size-4' />
                {t('siteBuilder.look.computer')}
              </Button>
              <Button
                variant={phone ? 'secondary' : 'ghost'}
                size='sm'
                aria-pressed={phone}
                onClick={() => setPhone(true)}
              >
                <Smartphone className='size-4' />
                {t('siteBuilder.look.phone')}
              </Button>
              <Button variant='ghost' size='icon' asChild>
                <a
                  href={address}
                  target='_blank'
                  rel='noreferrer'
                  aria-label={t('siteBuilder.preview.openNew')}
                >
                  <ExternalLink className='size-4' />
                </a>
              </Button>
            </div>
            <div className='flex min-h-0 flex-1 justify-center overflow-auto rounded-md bg-muted p-2'>
              <iframe
                key={address}
                src={address}
                title={t('siteBuilder.look.exampleTitle', {
                  name: direction.name,
                })}
                sandbox='allow-scripts allow-same-origin'
                className={cn(
                  'h-full rounded-md border bg-background',
                  phone ? 'w-96 max-w-full' : 'w-full'
                )}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  onChoose(direction)
                  onOpenChange(false)
                }}
              >
                {t('siteBuilder.look.useThis')}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import {
  getQuestions,
  startRun,
  type Direction,
  type SiteDetail,
} from './data/api'
import { DirectionCard } from './direction-card'
import { siteErrorText } from './errors'
import { ExampleDialog } from './example-dialog'

type LookDialogProps = {
  site: SiteDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  onStarted: () => void
}

/** Choose another look: a revise run that rewrites the theme and redesigns the pages. */
export function LookDialog({
  site,
  open,
  onOpenChange,
  onStarted,
}: LookDialogProps) {
  const { t } = useTranslation()
  const [directions, setDirections] = useState<Direction[] | null>(null)
  const [chosen, setChosen] = useState<Direction | null>(null)
  const [example, setExample] = useState<Direction | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || directions) return
    getQuestions(site.id)
      .then((result) => setDirections(result.all_directions))
      .catch((problem) => setError(siteErrorText(t, problem)))
  }, [open, directions, site.id, t])

  const apply = async () => {
    setBusy(true)
    try {
      if (!chosen) return
      await startRun(site.id, {
        kind: 'revise',
        direction: chosen.key,
        variant: chosen.variant,
      })
      toast.success(t('siteBuilder.toast.started'))
      onOpenChange(false)
      onStarted()
    } catch (problem) {
      toast.error(siteErrorText(t, problem))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-screen overflow-y-auto sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>{t('siteBuilder.look.changeTitle')}</DialogTitle>
          <DialogDescription>
            {t('siteBuilder.look.changeHelp')}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role='alert' className='text-sm text-destructive'>
            {error}
          </p>
        ) : !directions ? (
          <p className='flex items-center gap-2 text-sm text-muted-foreground'>
            <Loader2 className='size-4 animate-spin' />
            {t('siteBuilder.preview.loading')}
          </p>
        ) : (
          <div
            role='radiogroup'
            aria-label={t('siteBuilder.look.changeTitle')}
            className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
          >
            {directions
              .filter(
                (direction) =>
                  direction.key !== site.design_direction ||
                  direction.variant !== site.design_variant
              )
              .map((direction) => (
                <DirectionCard
                  key={direction.key}
                  direction={direction}
                  selected={direction.key === chosen?.key}
                  onSelect={() => setChosen(direction)}
                  onPreview={() => setExample(direction)}
                />
              ))}
          </div>
        )}
        <ExampleDialog
          direction={example}
          onOpenChange={(open) => !open && setExample(null)}
          onChoose={setChosen}
        />
        <DialogFooter>
          <Button onClick={() => void apply()} disabled={!chosen || busy}>
            {busy ? <Loader2 className='size-4 animate-spin' /> : null}
            {busy
              ? t('siteBuilder.look.applying')
              : t('siteBuilder.look.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

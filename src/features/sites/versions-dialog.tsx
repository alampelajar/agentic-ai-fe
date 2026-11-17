import { useState } from 'react'
import { History } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { restoreVersion, type SiteDetail, type SiteVersion } from './data/api'
import { siteErrorText } from './errors'

type VersionsDialogProps = {
  site: SiteDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  busy: boolean
  onChanged: () => void
}

export function VersionsDialog({
  site,
  open,
  onOpenChange,
  busy,
  onChanged,
}: VersionsDialogProps) {
  const { t, i18n } = useTranslation()
  const [target, setTarget] = useState<SiteVersion | null>(null)
  const [restoring, setRestoring] = useState(false)

  const restore = async (version: SiteVersion) => {
    setRestoring(true)
    try {
      await restoreVersion(site.id, version.number)
      toast.success(t('siteBuilder.toast.restored', { number: version.number }))
      setTarget(null)
      onOpenChange(false)
      onChanged()
    } catch (error) {
      toast.error(siteErrorText(t, error))
    } finally {
      setRestoring(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{t('siteBuilder.versions.title')}</DialogTitle>
            <DialogDescription>
              {t('siteBuilder.versions.help')}
            </DialogDescription>
          </DialogHeader>
          {site.versions.length === 0 ? (
            <div className='rounded-lg border border-dashed p-6 text-center'>
              <History className='mx-auto mb-2 size-6 text-muted-foreground' />
              <p className='text-sm text-muted-foreground'>
                {t('siteBuilder.versions.empty')}
              </p>
            </div>
          ) : (
            <ol className='max-h-96 space-y-2 overflow-y-auto'>
              {site.versions.map((version) => {
                const current = version.number === site.current_version
                return (
                  <li
                    key={version.id}
                    className='flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between'
                  >
                    <div className='min-w-0'>
                      <p className='flex flex-wrap items-center gap-2 text-sm font-medium'>
                        {t('siteBuilder.workspace.version', {
                          number: version.number,
                        })}
                        {current ? (
                          <Badge variant='secondary'>
                            {t('siteBuilder.versions.current')}
                          </Badge>
                        ) : null}
                        {site.published &&
                        site.published_version === version.number ? (
                          <Badge>{t('siteBuilder.versions.online')}</Badge>
                        ) : null}
                      </p>
                      <p className='mt-1 text-sm text-muted-foreground'>
                        {version.summary}
                      </p>
                      <p className='mt-1 text-xs text-muted-foreground'>
                        {new Date(version.created_at).toLocaleString(
                          i18n.language
                        )}
                      </p>
                    </div>
                    {!current ? (
                      <Button
                        variant='outline'
                        size='sm'
                        disabled={busy}
                        onClick={() => setTarget(version)}
                      >
                        {t('siteBuilder.versions.restore')}
                      </Button>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(next) => !next && setTarget(null)}
        title={t('siteBuilder.versions.restoreTitle', {
          number: target?.number ?? 0,
        })}
        desc={t('siteBuilder.versions.restoreDesc', {
          number: target?.number ?? 0,
        })}
        confirmText={
          restoring
            ? t('siteBuilder.versions.restoring')
            : t('siteBuilder.versions.restore')
        }
        cancelBtnText={t('siteBuilder.publish.close')}
        isLoading={restoring}
        handleConfirm={() => target && void restore(target)}
      />
    </>
  )
}

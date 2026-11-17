import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { cancelRun, type AgentRun } from '../data/api'
import { siteErrorText } from '../errors'

/** Stops a run after a confirmation; the finished parts are kept. */
export function CancelButton({
  siteId,
  run,
}: {
  siteId: number
  run: AgentRun
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const stopping = busy || run.cancel_requested

  const cancel = async () => {
    setBusy(true)
    try {
      await cancelRun(siteId, run.id)
      toast.success(t('siteBuilder.toast.cancelled'))
      setOpen(false)
    } catch (problem) {
      toast.error(siteErrorText(t, problem))
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        variant='outline'
        onClick={() => setOpen(true)}
        disabled={stopping}
      >
        {stopping ? <Loader2 className='size-4 animate-spin' /> : null}
        {stopping
          ? t('siteBuilder.run.cancelling')
          : t('siteBuilder.run.cancel')}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t('siteBuilder.run.cancelTitle')}
        desc={t('siteBuilder.run.cancelDesc')}
        confirmText={t('siteBuilder.run.cancel')}
        cancelBtnText={t('siteBuilder.publish.close')}
        destructive
        isLoading={busy}
        handleConfirm={() => void cancel()}
      />
    </>
  )
}

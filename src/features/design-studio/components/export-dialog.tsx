import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { downloadBlob, exportBlob, exportScope, safeFileName, type ExportFormat } from '../model/export'
import { useDoc, useEditor } from '../model/store'
import { inputClass } from './fields'
import { DocThumbnail } from './svg-view'

const FORMATS: ExportFormat[] = ['png', 'jpg', 'svg']

export function ExportDialog({ open, onOpenChange, projectName }: { open: boolean; onOpenChange: (open: boolean) => void; projectName: string }) {
  const { t } = useTranslation()
  const doc = useDoc()
  const selection = useEditor((state) => state.selection)
  const [format, setFormat] = useState<ExportFormat>('png')
  const [scale, setScale] = useState(1)
  const [withBackground, setWithBackground] = useState(false)
  const [busy, setBusy] = useState(false)
  const scope = open ? exportScope(doc, selection) : null

  const run = async () => {
    if (!scope) return
    setBusy(true)
    try {
      const blob = await exportBlob(doc, scope, format, scale, withBackground)
      downloadBlob(blob, `${safeFileName(projectName)}.${format}`)
      toast.success(t('designStudio.exported'))
      onOpenChange(false)
    } catch {
      toast.error(t('designStudio.exportFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('designStudio.exportTitle')}</DialogTitle>
          <DialogDescription>
            {selection.length ? t('designStudio.exportSelection', { count: selection.length }) : t('designStudio.exportPage')}
          </DialogDescription>
        </DialogHeader>
        {scope ? (
          <div className='space-y-4'>
            <div className='flex h-40 items-center justify-center overflow-hidden rounded-md border bg-muted/40 p-2'>
              <DocThumbnail doc={doc} ids={scope.ids} scope='export-' className='h-full w-full' />
            </div>
            <div className='grid grid-cols-2 gap-3 text-xs'>
              <label className='space-y-1'>
                <span className='text-muted-foreground'>{t('designStudio.format')}</span>
                <select className={inputClass} value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)}>
                  {FORMATS.map((item) => (
                    <option key={item} value={item}>
                      {item.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label className='space-y-1'>
                <span className='text-muted-foreground'>{t('designStudio.scale')}</span>
                <select className={inputClass} value={scale} disabled={format === 'svg'} onChange={(event) => setScale(Number(event.target.value))}>
                  {[1, 2, 3, 4].map((item) => (
                    <option key={item} value={item}>
                      {item}x · {Math.round(scope.bounds.width * item)} × {Math.round(scope.bounds.height * item)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className='flex items-center gap-2 text-xs'>
              <input type='checkbox' checked={withBackground} onChange={(event) => setWithBackground(event.target.checked)} />
              {t('designStudio.includeBackground')}
            </label>
          </div>
        ) : (
          <p className='text-sm text-muted-foreground'>{t('designStudio.nothingToExport')}</p>
        )}
        <DialogFooter>
          <Button disabled={!scope || busy} onClick={() => void run()}>
            {busy ? <Loader2 className='animate-spin' /> : <Download />}
            {t('designStudio.download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

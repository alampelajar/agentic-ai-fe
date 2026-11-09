import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { childrenOf, resolveColor } from '../model/document'
import { useDoc, useEditor } from '../model/store'
import { DocThumbnail } from './svg-view'

/** Shows each frame on its own, as a user would see the screen. */
export function PreviewMode({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const doc = useDoc()
  const selection = useEditor((state) => state.selection)
  const frames = childrenOf(doc, null).filter((node) => node.type === 'frame' && node.visible)
  const [index, setIndex] = useState(() => {
    const first = frames.findIndex((frame) => selection.includes(frame.id))
    return first === -1 ? 0 : first
  })
  const frame = frames[Math.min(index, frames.length - 1)]

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      event.stopPropagation()
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') setIndex((value) => Math.min(frames.length - 1, value + 1))
      if (event.key === 'ArrowLeft') setIndex((value) => Math.max(0, value - 1))
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [frames.length, onClose])

  return (
    <div role='dialog' aria-modal='true' aria-label={t('designStudio.preview')} className='fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white'>
      <div className='flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 text-sm'>
        <div className='flex min-w-0 items-center gap-1'>
          <Button variant='ghost' size='icon' aria-label={t('designStudio.previousFrame')} disabled={index <= 0} className='hover:bg-white/10 hover:text-white' onClick={() => setIndex(index - 1)}>
            <ChevronLeft />
          </Button>
          <span className='truncate tabular-nums'>
            {frame ? `${frame.name} · ${Math.round(frame.width)} × ${Math.round(frame.height)}` : t('designStudio.noFrames')}
          </span>
          <Button variant='ghost' size='icon' aria-label={t('designStudio.nextFrame')} disabled={index >= frames.length - 1} className='hover:bg-white/10 hover:text-white' onClick={() => setIndex(index + 1)}>
            <ChevronRight />
          </Button>
        </div>
        <Button variant='ghost' size='sm' className='hover:bg-white/10 hover:text-white' onClick={onClose}>
          <X />
          {t('designStudio.closePreview')}
        </Button>
      </div>
      <div className='flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8'>
        {frame ? (
          <DocThumbnail doc={doc} ids={[frame.id]} scope='preview-' className='max-h-full max-w-full' background={resolveColor(doc, frame.fill) || undefined} />
        ) : (
          <p className='text-sm text-white/60'>{t('designStudio.noFramesHint')}</p>
        )}
      </div>
    </div>
  )
}

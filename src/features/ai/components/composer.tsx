import { useLayoutEffect, useRef, type ChangeEvent, type RefObject } from 'react'
import { Link } from '@tanstack/react-router'
import { Paperclip, Send, Users, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

type Props = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  /** An agent and a model are chosen. */
  ready: boolean
  running: boolean
  modelName?: string
  files: File[]
  onFiles: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (index: number) => void
  fileInputRef: RefObject<HTMLInputElement | null>
  onDelegate: () => void
  delegateDisabled: boolean
  runtimeConnected: boolean
}

const MAX_HEIGHT = 220

/**
 * Where the person writes. It grows with the text, says in words why it cannot be
 * used yet instead of leaving a greyed-out box, names its attach and delegate
 * buttons for screen readers, and keeps the small print (the optional Desktop
 * Runtime, the keys) in one line under the box rather than in the page above.
 */
export function Composer({
  value,
  onChange,
  onSend,
  ready,
  running,
  modelName,
  files,
  onFiles,
  onRemoveFile,
  fileInputRef,
  onDelegate,
  delegateDisabled,
  runtimeConnected,
}: Props) {
  const { t } = useTranslation()
  const textarea = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const element = textarea.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`
  }, [value])

  const locked = !ready || running
  const canSend = ready && !running && value.trim() !== ''

  return (
    <div className='shrink-0 bg-background px-4 pb-4 pt-2 sm:px-6'>
      <div className='mx-auto w-full max-w-4xl'>
        {files.length > 0 && (
          <ul className='mb-2 flex flex-wrap gap-2'>
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className='flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs'>
                <span className='max-w-[12rem] truncate'>{file.name}</span>
                <button
                  type='button'
                  onClick={() => onRemoveFile(index)}
                  aria-label={t('agentic.composer.removeFile', { name: file.name })}
                  className='rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                >
                  <X aria-hidden='true' className='size-3' />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className='rounded-lg border border-border bg-card transition-colors focus-within:border-ring'>
          {!ready && (
            <p id='composer-hint' className='px-4 pt-3 text-sm text-muted-foreground'>
              {t('agentic.composer.needAgent')}
            </p>
          )}

          <textarea
            ref={textarea}
            rows={2}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                if (canSend) onSend()
              }
            }}
            disabled={locked}
            aria-describedby={ready ? undefined : 'composer-hint'}
            aria-label={ready ? t('agentic.input.writeMessage', { model: modelName ?? '' }) : t('agentic.composer.needAgent')}
            placeholder={ready ? (running ? t('agentic.input.processing') : t('agentic.input.writeMessage', { model: modelName ?? '' })) : ''}
            className='block max-h-[220px] min-h-[56px] w-full resize-none border-0 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed'
          />

          <div className='flex items-center justify-between px-2 pb-2'>
            <div className='flex items-center gap-1'>
              <input ref={fileInputRef} type='file' accept='image/png,image/jpeg,image/jpg,image/webp,image/gif' multiple onChange={onFiles} className='hidden' />
              <Button type='button' variant='ghost' size='icon' className='size-8' onClick={() => fileInputRef.current?.click()} disabled={locked} aria-label={t('agentic.composer.attach')} title={t('agentic.composer.attach')}>
                <Paperclip aria-hidden='true' className='size-4' />
              </Button>
              <Button type='button' variant='ghost' size='icon' className='size-8' onClick={onDelegate} disabled={delegateDisabled} aria-label={t('delegation.button')} title={t('delegation.button')}>
                <Users aria-hidden='true' className='size-4' />
              </Button>
            </div>

            <Button type='button' size='sm' onClick={onSend} disabled={!canSend} className='bg-foreground text-background hover:bg-foreground/90'>
              <Send aria-hidden='true' className='size-3.5' />
              {t('agentic.composer.send')}
            </Button>
          </div>
        </div>

        <div className='mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground'>
          <p data-testid='desktop-runtime-status'>
            {t('desktopRuntime.chat.statusLabel')}: {runtimeConnected ? t('desktopRuntime.chat.connected') : t('desktopRuntime.chat.notConnected')}
            {' | '}
            <Link to='/settings/integrations' className='underline'>
              {t('desktopRuntime.chat.manage')}
            </Link>
          </p>
          <p>{t('agentic.composer.hint')}</p>
        </div>
      </div>
    </div>
  )
}

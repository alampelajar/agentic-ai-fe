import { useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react'
import { Link } from '@tanstack/react-router'
import { Paperclip, Send, Users, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { filterSkills, insertSkillCommand, matchSkillCommand, type SkillOption } from './skill-command'

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
  /** Skills the person may call with a slash command. */
  skills?: SkillOption[]
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
  skills = [],
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

  // Slash commands: "/" at the start offers the person's skills.
  const [caret, setCaret] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  // The text for which the menu was closed with Escape; typing again reopens it.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null)
  const pendingCaret = useRef<number | null>(null)

  const command = useMemo(() => matchSkillCommand(value, caret), [value, caret])
  const options = useMemo(() => (command ? filterSkills(skills, command.query) : []), [command, skills])
  const menuOpen = !locked && command !== null && options.length > 0 && dismissedFor !== value
  const safeIndex = Math.min(activeIndex, Math.max(options.length - 1, 0))

  useLayoutEffect(() => {
    if (pendingCaret.current === null || !textarea.current) return
    textarea.current.setSelectionRange(pendingCaret.current, pendingCaret.current)
    pendingCaret.current = null
  }, [value])

  const chooseSkill = (skill: SkillOption) => {
    if (!command) return
    const next = insertSkillCommand(value, caret, command, skill.slug)
    pendingCaret.current = next.caret
    setCaret(next.caret)
    setActiveIndex(0)
    onChange(next.value)
    textarea.current?.focus()
  }

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

        <div className='relative rounded-lg border border-border bg-card transition-colors focus-within:border-ring'>
          {menuOpen && (
            <ul
              id='skill-command-list'
              role='listbox'
              aria-label={t('agentic.composer.skills')}
              className='absolute inset-x-0 bottom-full z-20 mb-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg'
            >
              {options.map((skill, index) => (
                <li
                  key={skill.slug}
                  id={`skill-command-${skill.slug}`}
                  role='option'
                  aria-selected={index === safeIndex}
                  onMouseDown={(event) => {
                    // Keep the focus in the text box so the caret stays where it was.
                    event.preventDefault()
                    chooseSkill(skill)
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex cursor-pointer items-baseline gap-3 rounded-md px-3 py-2 text-sm ${
                    index === safeIndex ? 'bg-muted' : ''
                  }`}
                >
                  <span className='shrink-0 font-medium'>/{skill.slug}</span>
                  <span className='min-w-0 truncate text-muted-foreground'>{skill.description || skill.name}</span>
                </li>
              ))}
            </ul>
          )}

          {!ready && (
            <p id='composer-hint' className='px-4 pt-3 text-sm text-muted-foreground'>
              {t('agentic.composer.needAgent')}
            </p>
          )}

          <textarea
            ref={textarea}
            rows={2}
            value={value}
            onChange={(event) => {
              setCaret(event.target.selectionStart)
              setActiveIndex(0)
              onChange(event.target.value)
            }}
            onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
            aria-autocomplete={skills.length > 0 ? 'list' : undefined}
            aria-controls={menuOpen ? 'skill-command-list' : undefined}
            aria-activedescendant={menuOpen ? `skill-command-${options[safeIndex].slug}` : undefined}
            onKeyDown={(event) => {
              if (menuOpen && !event.nativeEvent.isComposing) {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  const step = event.key === 'ArrowDown' ? 1 : -1
                  setActiveIndex((safeIndex + step + options.length) % options.length)
                  return
                }
                if (event.key === 'Enter' || event.key === 'Tab') {
                  event.preventDefault()
                  chooseSkill(options[safeIndex])
                  return
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setDismissedFor(value)
                  return
                }
              }
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

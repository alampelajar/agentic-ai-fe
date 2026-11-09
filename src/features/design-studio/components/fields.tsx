import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { ColorToken, SizeToken } from '../model/types'

export const inputClass =
  'h-7 w-full min-w-0 rounded-md border border-transparent bg-muted/60 px-2 text-xs outline-none transition-colors hover:border-border focus:border-primary focus:bg-background disabled:opacity-50'

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className='border-b px-3 py-3'>
      <div className='mb-2 flex min-h-5 items-center justify-between gap-2'>
        <h3 className='text-[11px] font-semibold text-foreground'>{title}</h3>
        {action}
      </div>
      <div className='space-y-2'>{children}</div>
    </section>
  )
}

/** A number box that commits on Enter or blur, and steps with the arrow keys. */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  suffix,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  suffix?: string
}) {
  const shown = String(Math.round(value * 100) / 100)
  const [draft, setDraft] = useState(shown)
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setDraft(shown)
  }, [shown, focused])

  const clamp = (next: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next))
  const commit = () => {
    const parsed = Number(draft)
    if (draft.trim() !== '' && Number.isFinite(parsed)) {
      if (clamp(parsed) !== value) onChange(clamp(parsed))
      setDraft(String(clamp(parsed)))
    } else {
      setDraft(shown)
    }
  }

  return (
    <label className='flex min-w-0 items-center gap-1.5 rounded-md bg-muted/60 pl-2 text-xs focus-within:ring-1 focus-within:ring-primary'>
      <span className='shrink-0 text-[11px] text-muted-foreground'>{label}</span>
      <input
        inputMode='decimal'
        aria-label={label}
        disabled={disabled}
        value={draft}
        onFocus={() => setFocused(true)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          setFocused(false)
          commit()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault()
            const amount = (event.shiftKey ? 10 : 1) * step * (event.key === 'ArrowUp' ? 1 : -1)
            const next = clamp(Math.round((value + amount) * 100) / 100)
            setDraft(String(next))
            onChange(next)
          }
        }}
        className='h-7 w-full min-w-0 bg-transparent pr-1 text-xs outline-none disabled:opacity-50'
      />
      {suffix && <span className='pr-2 text-[11px] text-muted-foreground'>{suffix}</span>}
    </label>
  )
}

/** A colour: a swatch, its hex value, and the option to use a colour token. */
export function ColorField({
  label,
  value,
  resolved,
  tokens,
  onChange,
  allowNone = true,
}: {
  label: string
  value: string
  resolved: string
  tokens: ColorToken[]
  onChange: (value: string) => void
  allowNone?: boolean
}) {
  const { t } = useTranslation()
  const isToken = value.startsWith('$')
  const [hex, setHex] = useState(resolved)
  useEffect(() => setHex(resolved), [resolved])

  const commitHex = () => {
    const next = hex.trim()
    if (next === '' && allowNone) {
      if (value !== '') onChange('')
    } else if (/^#?[0-9a-f]{6}$/i.test(next)) {
      const normal = next.startsWith('#') ? next.toLowerCase() : `#${next.toLowerCase()}`
      if (normal !== value) onChange(normal)
    } else {
      setHex(resolved)
    }
  }

  return (
    <div className='space-y-1'>
      <div className='text-[11px] text-muted-foreground'>{label}</div>
      <div className='grid grid-cols-[1.75rem_1fr_1fr] items-center gap-1.5'>
        <input
          type='color'
          aria-label={label}
          value={/^#[0-9a-f]{6}$/i.test(resolved) ? resolved : '#ffffff'}
          onChange={(event) => onChange(event.target.value)}
          className={cn('size-7 cursor-pointer rounded-md border bg-transparent p-0.5', !resolved && 'opacity-40')}
        />
        <input
          aria-label={`${label} hex`}
          value={isToken ? resolved : hex}
          disabled={isToken}
          placeholder={t('designStudio.none')}
          onChange={(event) => setHex(event.target.value)}
          onBlur={commitHex}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          className={inputClass}
        />
        <select
          aria-label={`${label} ${t('designStudio.token')}`}
          value={isToken ? value : ''}
          onChange={(event) => onChange(event.target.value || resolved)}
          className={inputClass}
        >
          <option value=''>{t('designStudio.custom')}</option>
          {tokens.map((token) => (
            <option key={token.id} value={`$${token.id}`}>
              {token.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

/** A size in pixels, or a spacing or radius token. */
export function SizeField({
  label,
  value,
  resolved,
  tokens,
  onChange,
}: {
  label: string
  value: number | string
  resolved: number
  tokens: SizeToken[]
  onChange: (value: number | string) => void
}) {
  const { t } = useTranslation()
  const isToken = typeof value === 'string'
  return (
    <div className='grid grid-cols-2 gap-1.5'>
      <NumberField label={label} value={resolved} min={0} disabled={isToken} onChange={onChange} />
      <select
        aria-label={`${label} ${t('designStudio.token')}`}
        value={isToken ? value : ''}
        onChange={(event) => onChange(event.target.value || resolved)}
        className={inputClass}
      >
        <option value=''>{t('designStudio.custom')}</option>
        {tokens.map((token) => (
          <option key={token.id} value={`$${token.id}`}>
            {token.name} · {token.value}
          </option>
        ))}
      </select>
    </div>
  )
}

export function IconButton({
  label,
  active,
  className,
  children,
  ...props
}: { label: string; active?: boolean } & React.ComponentProps<'button'>) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4',
        active && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

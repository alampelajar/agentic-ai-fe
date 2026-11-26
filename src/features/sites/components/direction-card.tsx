import { Check, Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Direction } from '../data/api'

type DirectionCardProps = {
  direction: Direction
  selected: boolean
  onSelect: () => void
  /** Opens the look's example website. */
  onPreview: () => void
}

/**
 * One look to choose from: a small drawing in its colours and heading style (never a
 * picture of a website, by the owner's wish), a plain name, and a button to open the
 * example website.
 */
export function DirectionCard({
  direction,
  selected,
  onSelect,
  onPreview,
}: DirectionCardProps) {
  const { t } = useTranslation()
  const p = direction.palette
  const font = direction.serif ? 'Georgia, serif' : 'system-ui, sans-serif'
  const hasExample = Boolean(direction.sample_url)

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border bg-card transition-colors',
        selected
          ? 'border-primary ring-2 ring-primary'
          : 'border-border hover:border-primary'
      )}
    >
      <button
        type='button'
        role='radio'
        aria-checked={selected}
        aria-label={`${direction.name}. ${direction.description}`}
        onClick={onSelect}
        className='flex flex-1 flex-col text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
      >
        {/* A small drawing in the look's colours, never a picture of a website. */}
        <div
          aria-hidden='true'
          className='relative h-36 overflow-hidden border-b'
        >
          <div
            className='flex h-full flex-col gap-2 p-4'
            style={{ background: p.background, color: p.foreground }}
          >
            <div className='flex items-center justify-between'>
              <span
                className='h-2 w-12 rounded-full'
                style={{ background: p.foreground }}
              />
              <span className='flex gap-1'>
                <span
                  className='h-1.5 w-5 rounded-full'
                  style={{ background: p.muted }}
                />
                <span
                  className='h-1.5 w-5 rounded-full'
                  style={{ background: p.muted }}
                />
              </span>
            </div>
            <p
              className='mt-1 text-xl leading-tight font-semibold'
              style={{ fontFamily: font }}
            >
              {t('siteBuilder.look.sample')}
            </p>
            <span
              className='mt-auto w-fit px-3 py-1 text-xs'
              style={{
                background: p.primary,
                color: p.primary_foreground,
                borderRadius: direction.radius,
              }}
            >
              {t('siteBuilder.look.sampleButton')}
            </span>
          </div>
          <span className='absolute right-2 bottom-2 flex gap-1 rounded-md bg-background p-1'>
            {[p.primary, p.accent, p.surface].map((colour, index) => (
              <span
                key={index}
                className='size-4 rounded-sm border'
                style={{ background: colour }}
              />
            ))}
          </span>
        </div>
        <span className='flex flex-1 flex-col gap-1 p-4'>
          <span className='flex items-center justify-between gap-2 text-sm font-semibold'>
            {direction.name}
            {selected ? (
              <span className='flex items-center gap-1 text-xs font-medium text-primary'>
                <Check className='size-4' />
                {t('siteBuilder.look.chosen')}
              </span>
            ) : null}
          </span>
          <span className='text-xs text-muted-foreground'>
            {direction.description}
          </span>
          {direction.variant_name ? (
            <span className='text-xs font-medium'>
              {t('siteBuilder.look.colour', { name: direction.variant_name })}
            </span>
          ) : null}
        </span>
      </button>
      <div className='border-t p-2'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='w-full'
          disabled={!hasExample}
          onClick={onPreview}
        >
          <Eye className='size-4' />
          {hasExample
            ? t('siteBuilder.look.seeExample')
            : t('siteBuilder.look.noExample')}
        </Button>
      </div>
    </div>
  )
}

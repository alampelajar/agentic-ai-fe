import { Check, Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Direction } from '../data/api'
import { LookColours } from './look-colours'

type DirectionCardProps = {
  direction: Direction
  selected: boolean
  onSelect: () => void
  /** Opens the look's example website. */
  onPreview: () => void
}

/**
 * One look to choose from: its colours, each named by where it is used (never a
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
        <span className='border-b'>
          <LookColours palette={direction.palette} />
        </span>
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

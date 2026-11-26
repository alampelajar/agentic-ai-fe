import { useTranslation } from 'react-i18next'
import type { Direction } from '../data/api'

type Palette = Direction['palette']

/** Each colour of a look, with where on the website it is used. */
const USES: { key: string; colour: (p: Palette) => string }[] = [
  { key: 'page', colour: (p) => p.background },
  { key: 'boxes', colour: (p) => p.surface },
  { key: 'titles', colour: (p) => p.foreground },
  { key: 'buttons', colour: (p) => p.primary },
  { key: 'accent', colour: (p) => p.accent },
]

/**
 * The look's colours as boxes, each named by where it is used (page, boxes, titles,
 * buttons, accent). By the owner's wish the card shows no picture of a website.
 */
export function LookColours({ palette }: { palette: Palette }) {
  const { t } = useTranslation()
  return (
    // Five in a row only where each label fits; a narrow card uses rows of three.
    <span aria-hidden='true' className='@container block p-4'>
      <span className='grid grid-cols-3 gap-2 @xs:grid-cols-5'>
        {USES.map((use) => (
          <span key={use.key} className='flex min-w-0 flex-col gap-1'>
            <span
              className='block h-12 rounded-md border'
              style={{ background: use.colour(palette) }}
            />
            <span className='truncate text-center text-xs text-muted-foreground'>
              {t(`siteBuilder.look.uses.${use.key}`)}
            </span>
          </span>
        ))}
      </span>
    </span>
  )
}

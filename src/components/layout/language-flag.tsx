// A flag's colours are part of the flag, so they are fixed in light and dark mode.
// design-system-ignore: flag colours are fixed
const RED_ID = '#dc2626'
// design-system-ignore: flag colours are fixed
const WHITE = '#ffffff'
// design-system-ignore: flag colours are fixed
const BLUE_UK = '#012169'
// design-system-ignore: flag colours are fixed
const RED_UK = '#c8102e'

/** The flag beside a language name in the language menu. Decorative only. */
export function LanguageFlag({ language }: { language: 'id' | 'en' }) {
  if (language === 'id') {
    return (
      <svg
        aria-hidden='true'
        viewBox='0 0 60 40'
        className='h-4 w-6 shrink-0 overflow-hidden rounded-sm border border-border/70'
      >
        <rect width='60' height='20' fill={RED_ID} />
        <rect y='20' width='60' height='20' fill={WHITE} />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden='true'
      viewBox='0 0 60 40'
      className='h-4 w-6 shrink-0 overflow-hidden rounded-sm border border-border/70'
    >
      <rect width='60' height='40' fill={BLUE_UK} />
      <path d='M0 0 60 40M60 0 0 40' stroke={WHITE} strokeWidth='10' />
      <path d='M0 0 60 40M60 0 0 40' stroke={RED_UK} strokeWidth='4' />
      <path d='M30 0V40M0 20H60' stroke={WHITE} strokeWidth='15' />
      <path d='M30 0V40M0 20H60' stroke={RED_UK} strokeWidth='8' />
    </svg>
  )
}

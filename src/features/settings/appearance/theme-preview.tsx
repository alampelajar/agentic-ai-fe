import { cn } from '@/lib/utils'

// The pictures show light and dark mode side by side, so their colours stay fixed
// whichever mode is on now.
const COLOURS = {
  light: {
    // design-system-ignore: a fixed picture of light mode
    page: 'bg-[#ecedef]',
    // design-system-ignore: a fixed picture of light mode
    card: 'bg-white',
    // design-system-ignore: a fixed picture of light mode
    line: 'bg-[#ecedef]',
  },
  dark: {
    // design-system-ignore: a fixed picture of dark mode
    page: 'bg-slate-950',
    // design-system-ignore: a fixed picture of dark mode
    card: 'bg-slate-800',
    // design-system-ignore: a fixed picture of dark mode
    line: 'bg-slate-400',
  },
} as const

/** A small drawing of the app in light or dark mode, for the theme choice. */
export function ThemePreview({ mode }: { mode: 'light' | 'dark' }) {
  const colour = COLOURS[mode]
  return (
    <div className={cn('space-y-2 rounded-sm p-2', colour.page)}>
      <div className={cn('space-y-2 rounded-md p-2 shadow-xs', colour.card)}>
        <div className={cn('h-2 w-20 rounded-lg', colour.line)} />
        <div className={cn('h-2 w-25 rounded-lg', colour.line)} />
      </div>
      {[0, 1].map((row) => (
        <div
          key={row}
          className={cn(
            'flex items-center space-x-2 rounded-md p-2 shadow-xs',
            colour.card
          )}
        >
          <div className={cn('h-4 w-4 rounded-full', colour.line)} />
          <div className={cn('h-2 w-25 rounded-lg', colour.line)} />
        </div>
      ))}
    </div>
  )
}

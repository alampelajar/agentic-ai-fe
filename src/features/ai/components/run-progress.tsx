import { Check, Loader2 } from 'lucide-react'

type Props = {
  steps: { key: string; label: string }[]
  /** Index of the current step, -1 when there is none. */
  currentIndex: number
  progress: number
  /** What is happening right now, in words: the last tool that finished, or the agent thinking. */
  status: string
  running: boolean
}

/**
 * One strip over the composer that says where the run stands: the step it is on
 * in words (finished steps are ticked, later ones grey), the percentage, and a
 * 2px line in the accent as the only coloured mark. It replaces a row of numbered
 * circles, which said the same thing with more decoration.
 */
export function RunProgress({ steps, currentIndex, progress, status, running }: Props) {
  if (!running && currentIndex < 0) return null

  return (
    <div className='px-4 pb-2 sm:px-6' data-testid='run-progress'>
      <div className='mx-auto w-full max-w-4xl'>
        <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13px]'>
          <p className='flex min-w-0 items-center gap-2 text-muted-foreground' role='status'>
            {running && <Loader2 aria-hidden='true' className='size-3.5 shrink-0 animate-spin' />}
            <span className='truncate'>{status}</span>
          </p>
          <p className='tabular-nums text-muted-foreground'>{progress}%</p>
        </div>

        <div className='mt-1.5 h-0.5 overflow-hidden rounded-full bg-muted' aria-hidden='true'>
          <div className='h-full bg-primary transition-[width] duration-300' style={{ width: `${progress}%` }} />
        </div>

        <ol className='mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px]'>
          {steps.map((step, index) => {
            const done = index < currentIndex
            const active = index === currentIndex
            return (
              <li
                key={step.key}
                aria-current={active ? 'step' : undefined}
                className={`flex items-center gap-1 ${active ? 'font-medium text-foreground' : done ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}
              >
                {done && <Check aria-hidden='true' className='size-3' />}
                {step.label}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

import type { ReactNode, RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

export function StepHeading({
  title,
  help,
  refObject,
}: {
  title: string
  help?: string
  refObject: RefObject<HTMLHeadingElement | null>
}) {
  return (
    <div>
      <h2
        ref={refObject}
        tabIndex={-1}
        className='text-base font-semibold outline-none'
      >
        {title}
      </h2>
      {help ? (
        <p className='mt-1 text-sm text-muted-foreground'>{help}</p>
      ) : null}
    </div>
  )
}

/** "(optional)" after a label. */
export function OptionalMark() {
  const { t } = useTranslation()
  return (
    <span className='text-xs font-normal text-muted-foreground'>
      ({t('siteBuilder.wizard.optional')})
    </span>
  )
}

export function Field({
  id,
  label,
  optional,
  className,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>
        {label} {optional ? <OptionalMark /> : null}
      </Label>
      {children}
    </div>
  )
}

export function StepProblem({ problem }: { problem: string | null }) {
  if (!problem) return null
  return (
    <p role='alert' className='text-sm text-destructive'>
      {problem}
    </p>
  )
}

export function StepNav({ steps, step }: { steps: string[]; step: number }) {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('siteBuilder.wizard.steps')}>
      <ol className='flex flex-wrap gap-2'>
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? 'step' : undefined}
            className={cn(
              'rounded-full border px-3 py-1 text-xs',
              index === step
                ? 'border-primary bg-primary text-primary-foreground'
                : index < step
                  ? 'border-border text-foreground'
                  : 'border-border text-muted-foreground'
            )}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      <p className='sr-only'>
        {t('siteBuilder.wizard.stepOf', {
          current: step + 1,
          total: steps.length,
        })}
      </p>
    </nav>
  )
}

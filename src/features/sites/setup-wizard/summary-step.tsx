import type { RefObject } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { BriefSummary, Direction } from '../data/api'
import { StepHeading, StepProblem } from './parts'

type SummaryStepProps = {
  brief: BriefSummary
  direction: Direction | undefined
  language: 'id' | 'en'
  busy: boolean
  problem: string | null
  headingRef: RefObject<HTMLHeadingElement | null>
  onEdit: () => void
  onCreate: () => void
}

/** Step 4: the plan in plain words, and the "Create" approval. */
export function SummaryStep({
  brief,
  direction,
  language,
  busy,
  problem,
  headingRef,
  onEdit,
  onCreate,
}: SummaryStepProps) {
  const { t } = useTranslation()

  return (
    <section className='space-y-6'>
      <StepHeading
        refObject={headingRef}
        title={t('siteBuilder.wizard.summaryTitle')}
      />
      <div className='space-y-1'>
        <p className='text-base font-semibold'>{brief.name}</p>
        {brief.tagline ? (
          <p className='text-sm text-muted-foreground'>{brief.tagline}</p>
        ) : null}
      </div>
      <p className='text-sm'>{brief.summary}</p>
      <dl className='grid gap-4 sm:grid-cols-2'>
        <div>
          <dt className='text-xs text-muted-foreground'>
            {t('siteBuilder.wizard.pagesLabel')}
          </dt>
          <dd className='mt-1 flex flex-wrap gap-2'>
            {brief.pages.map((page) => (
              <span key={page} className='rounded-md border px-2 py-1 text-sm'>
                {page}
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt className='text-xs text-muted-foreground'>
            {t('siteBuilder.wizard.lookLabel')}
          </dt>
          <dd className='mt-1 text-sm'>
            {direction?.name}
            {direction?.variant_name ? ` (${direction.variant_name})` : ''}
          </dd>
        </div>
        <div>
          <dt className='text-xs text-muted-foreground'>
            {t('siteBuilder.wizard.languageLabel')}
          </dt>
          <dd className='mt-1 text-sm'>
            {(brief.language ?? language) === 'en'
              ? t('siteBuilder.wizard.languageEn')
              : t('siteBuilder.wizard.languageId')}
          </dd>
        </div>
      </dl>
      <StepProblem problem={problem} />
      <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-between'>
        <Button variant='outline' onClick={onEdit} disabled={busy}>
          {t('siteBuilder.wizard.editAnswers')}
        </Button>
        <Button onClick={onCreate} disabled={busy}>
          {busy ? <Loader2 className='size-4 animate-spin' /> : null}
          {busy
            ? t('siteBuilder.wizard.creating')
            : t('siteBuilder.wizard.create')}
        </Button>
      </div>
    </section>
  )
}

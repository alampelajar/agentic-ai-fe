import { useState, type RefObject } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { Direction } from '../data/api'
import { DirectionCard } from '../direction-card'
import { ExampleDialog } from '../example-dialog'
import { StepHeading, StepProblem } from './parts'

type LookStepProps = {
  looks: Direction[]
  selected: string
  onChoose: (direction: Direction) => void
  showAll: boolean
  onShowAll: (showAll: boolean) => void
  busy: boolean
  problem: string | null
  headingRef: RefObject<HTMLHeadingElement | null>
  onBack: () => void
  onNext: () => void
}

/** Step 3: one of three looks, each with an example website to open first. */
export function LookStep({
  looks,
  selected,
  onChoose,
  showAll,
  onShowAll,
  busy,
  problem,
  headingRef,
  onBack,
  onNext,
}: LookStepProps) {
  const { t } = useTranslation()
  const [example, setExample] = useState<Direction | null>(null)

  return (
    <section className='space-y-6'>
      <StepHeading
        refObject={headingRef}
        title={t('siteBuilder.wizard.lookTitle')}
        help={t('siteBuilder.wizard.lookHelp')}
      />
      <div
        role='radiogroup'
        aria-label={t('siteBuilder.wizard.lookTitle')}
        className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
      >
        {looks.map((item) => (
          <DirectionCard
            key={item.key}
            direction={item}
            selected={item.key === selected}
            onSelect={() => onChoose(item)}
            onPreview={() => setExample(item)}
          />
        ))}
      </div>
      <ExampleDialog
        direction={example}
        onOpenChange={(open) => !open && setExample(null)}
        onChoose={onChoose}
      />
      <Button variant='ghost' size='sm' onClick={() => onShowAll(!showAll)}>
        {showAll
          ? t('siteBuilder.wizard.fewerLooks')
          : t('siteBuilder.wizard.moreLooks')}
      </Button>
      <StepProblem problem={problem} />
      <div className='flex justify-between gap-2'>
        <Button variant='outline' onClick={onBack} disabled={busy}>
          {t('siteBuilder.wizard.back')}
        </Button>
        <Button onClick={onNext} disabled={busy}>
          {busy ? <Loader2 className='size-4 animate-spin' /> : null}
          {busy
            ? t('siteBuilder.wizard.planning')
            : t('siteBuilder.wizard.next')}
        </Button>
      </div>
    </section>
  )
}

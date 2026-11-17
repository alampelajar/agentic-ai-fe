import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Question, QuestionsResult } from '../data/api'
import { OptionalMark, StepHeading } from './parts'

type Answers = Record<string, string[]>

type QuestionsStepProps = {
  data: QuestionsResult
  answers: Answers
  onAnswers: (answers: Answers) => void
  other: Record<string, string>
  onOther: (other: Record<string, string>) => void
  extra: string
  onExtra: (extra: string) => void
  headingRef: RefObject<HTMLHeadingElement | null>
  onNext: () => void
}

/** Step 1: what we understood from the description, and the questions still open. */
export function QuestionsStep({
  data,
  answers,
  onAnswers,
  other,
  onOther,
  extra,
  onExtra,
  headingRef,
  onNext,
}: QuestionsStepProps) {
  const { t } = useTranslation()

  return (
    <section className='space-y-6'>
      {data.understood && data.understood.length > 0 ? (
        <div className='space-y-2 rounded-lg border bg-muted/50 p-4'>
          <h2
            ref={data.questions.length === 0 ? headingRef : undefined}
            tabIndex={-1}
            className='text-base font-semibold outline-none'
          >
            {t('siteBuilder.wizard.understoodTitle')}
          </h2>
          <dl className='space-y-1 text-sm'>
            {data.understood.map((fact) => (
              <div
                key={fact.label + fact.value}
                className='flex flex-wrap gap-x-2'
              >
                <dt className='text-muted-foreground'>{fact.label}:</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
          <p className='text-xs text-muted-foreground'>
            {t('siteBuilder.wizard.understoodHelp')}
          </p>
        </div>
      ) : null}
      {data.questions.length > 0 ? (
        <StepHeading
          refObject={headingRef}
          title={t('siteBuilder.wizard.questionsTitle')}
          help={t('siteBuilder.wizard.questionsHelp')}
        />
      ) : (
        <p className='text-sm'>{t('siteBuilder.wizard.noQuestions')}</p>
      )}
      {data.questions.map((question) =>
        question.free ? (
          <FreeQuestion
            key={question.id}
            question={question}
            value={(answers[question.id] ?? [''])[0]}
            onChange={(value) =>
              onAnswers({
                ...answers,
                [question.id]: value.trim() ? [value] : [],
              })
            }
          />
        ) : (
          <ChoiceQuestion
            key={question.id}
            question={question}
            chosen={answers[question.id] ?? []}
            onChosen={(chosen) =>
              onAnswers({ ...answers, [question.id]: chosen })
            }
            other={other[question.id]}
            onOther={(text) => {
              const next = { ...other }
              if (text === undefined) delete next[question.id]
              else next[question.id] = text
              onOther(next)
            }}
          />
        )
      )}
      <div className='space-y-2'>
        <Label htmlFor='site-extra'>
          {t('siteBuilder.wizard.extraLabel')} <OptionalMark />
        </Label>
        <Textarea
          id='site-extra'
          value={extra}
          maxLength={1000}
          onChange={(event) => onExtra(event.target.value)}
          placeholder={t('siteBuilder.wizard.extraPlaceholder')}
        />
      </div>
      <div className='flex justify-end'>
        <Button onClick={onNext}>{t('siteBuilder.wizard.next')}</Button>
      </div>
    </section>
  )
}

/** A question answered in the person's own words (how a couple met). */
function FreeQuestion({
  question,
  value,
  onChange,
}: {
  question: Question
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className='space-y-2'>
      <Label htmlFor={`site-q-${question.id}`}>
        {question.text} <OptionalMark />
      </Label>
      <Textarea
        id={`site-q-${question.id}`}
        value={value}
        maxLength={1500}
        rows={4}
        placeholder={t('siteBuilder.wizard.freePlaceholder')}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

/** A question with buttons, plus "Other" with free text. */
function ChoiceQuestion({
  question,
  chosen,
  onChosen,
  other,
  onOther,
}: {
  question: Question
  chosen: string[]
  onChosen: (chosen: string[]) => void
  /** undefined while "Other" is not chosen. */
  other: string | undefined
  onOther: (text: string | undefined) => void
}) {
  const { t } = useTranslation()

  const toggle = (option: string) => {
    if (!question.multiple) {
      onChosen(chosen[0] === option ? [] : [option])
      return
    }
    onChosen(
      chosen.includes(option)
        ? chosen.filter((item) => item !== option)
        : [...chosen, option]
    )
  }

  return (
    <fieldset className='space-y-2'>
      <legend className='text-sm font-medium'>{question.text}</legend>
      <p className='text-xs text-muted-foreground'>
        {question.multiple
          ? t('siteBuilder.wizard.chooseMany')
          : t('siteBuilder.wizard.chooseOne')}
      </p>
      <div className='flex flex-wrap gap-2'>
        {question.options.map((option) => {
          const pressed = chosen.includes(option)
          return (
            <Button
              key={option}
              type='button'
              size='sm'
              variant={pressed ? 'default' : 'outline'}
              aria-pressed={pressed}
              onClick={() => toggle(option)}
            >
              {option}
            </Button>
          )
        })}
        <Button
          type='button'
          size='sm'
          variant={other !== undefined ? 'default' : 'outline'}
          aria-pressed={other !== undefined}
          onClick={() => onOther(other === undefined ? '' : undefined)}
        >
          {t('siteBuilder.wizard.other')}
        </Button>
      </div>
      {other !== undefined ? (
        <Input
          aria-label={`${question.text} ${t('siteBuilder.wizard.otherLabel')}`}
          placeholder={t('siteBuilder.wizard.otherLabel')}
          value={other}
          maxLength={200}
          onChange={(event) => onOther(event.target.value)}
        />
      ) : null}
    </fieldset>
  )
}

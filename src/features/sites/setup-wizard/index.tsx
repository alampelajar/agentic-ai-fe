import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  getQuestions,
  makeBrief,
  startRun,
  type BriefSummary,
  type Contact,
  type Direction,
  type QuestionsResult,
  type SiteDetail,
  type SiteImage,
} from '../data/api'
import { siteErrorText } from '../lib/errors'
import { DetailsStep } from './details-step'
import {
  EMPTY_CONTACT,
  fillKnownContact,
  isCouple,
  isOccasion,
  mergeOtherAnswers,
} from './kinds'
import { LookStep } from './look-step'
import { StepNav } from './parts'
import { QuestionsStep } from './questions-step'
import { SummaryStep } from './summary-step'

type SetupWizardProps = {
  site: SiteDetail
  onStarted: () => void
}

const STEP = { questions: 0, details: 1, look: 2, summary: 3 } as const

/**
 * Describe, answer, choose a look, confirm: the only questions a person is asked before
 * the website is made. Every question is a choice; nothing technical is asked.
 */
export function SetupWizard({ site, onStarted }: SetupWizardProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<number>(STEP.questions)
  const [data, setData] = useState<QuestionsResult | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [other, setOther] = useState<Record<string, string>>({})
  const [extra, setExtra] = useState('')
  const [name, setName] = useState(site.brief?.name ?? '')
  const [contact, setContact] = useState<Contact>(
    site.brief?.contact ?? EMPTY_CONTACT
  )
  const [images, setImages] = useState<SiteImage[]>(site.images ?? [])
  const [direction, setDirection] = useState(site.design_direction)
  const [variant, setVariant] = useState(site.design_variant ?? '')
  const [language, setLanguage] = useState<'id' | 'en'>(site.language)
  const [showAll, setShowAll] = useState(false)
  const [brief, setBrief] = useState<BriefSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const load = async () => {
    setLoadError(null)
    try {
      const result = await getQuestions(site.id)
      setData(result)
      if (!site.brief?.name && result.suggested_name)
        setName(result.suggested_name)
      if (!site.brief) {
        setLanguage(result.language)
        setContact((current) => fillKnownContact(current, result))
      }
      // A copied website starts with the look of the website it copies.
      if (result.remix && !site.design_direction) {
        setDirection(result.remix.direction)
        setVariant(result.remix.variant)
      }
    } catch (error) {
      setLoadError(siteErrorText(t, error))
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site.id])

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  const kind = data?.kind ?? site.kind
  const occasion = isOccasion(kind)
  const couple = isCouple(kind)
  const steps = [
    t('siteBuilder.wizard.stepQuestions'),
    occasion
      ? t('siteBuilder.wizard.stepDetailsEvent')
      : t('siteBuilder.wizard.stepDetails'),
    t('siteBuilder.wizard.stepLook'),
    t('siteBuilder.wizard.stepSummary'),
  ]

  const goToLook = () => {
    if (!name.trim()) {
      setProblem(t('siteBuilder.wizard.nameRequired'))
      return
    }
    setProblem(null)
    setStep(STEP.look)
  }

  const plan = async () => {
    if (!direction) {
      setProblem(t('siteBuilder.wizard.lookRequired'))
      return
    }
    setProblem(null)
    setBusy(true)
    try {
      setBrief(
        await makeBrief(site.id, {
          name: name.trim(),
          answers: mergeOtherAnswers(answers, other),
          extra,
          contact,
          direction,
          variant,
          language,
        })
      )
      setStep(STEP.summary)
    } catch (error) {
      setProblem(siteErrorText(t, error))
    } finally {
      setBusy(false)
    }
  }

  const create = async () => {
    setBusy(true)
    try {
      await startRun(site.id, { kind: 'create' })
      toast.success(t('siteBuilder.toast.started'))
      onStarted()
    } catch (error) {
      setProblem(siteErrorText(t, error))
    } finally {
      setBusy(false)
    }
  }

  if (loadError) {
    return (
      <Card role='alert'>
        <CardContent className='py-10 text-center'>
          <p className='font-medium'>
            {t('siteBuilder.wizard.questionsError')}
          </p>
          <p className='mt-1 text-sm text-muted-foreground'>{loadError}</p>
          <Button
            className='mt-4'
            variant='outline'
            onClick={() => void load()}
          >
            {t('siteBuilder.retry')}
          </Button>
        </CardContent>
      </Card>
    )
  }
  if (!data) {
    return (
      <p className='flex items-center gap-2 text-sm text-muted-foreground'>
        <Loader2 className='size-4 animate-spin' />
        {t('siteBuilder.wizard.loadingQuestions')}
      </p>
    )
  }

  const looks: Direction[] = showAll ? data.all_directions : data.directions
  const chosenDirection =
    looks.find((item) => item.key === direction) ??
    data.all_directions.find((item) => item.key === direction)
  const choose = (item: Direction) => {
    setDirection(item.key)
    setVariant(item.variant)
  }

  return (
    <div className='space-y-6'>
      <StepNav steps={steps} step={step} />
      <Card>
        <CardContent className='space-y-6'>
          {step === STEP.questions ? (
            <QuestionsStep
              data={data}
              answers={answers}
              onAnswers={setAnswers}
              other={other}
              onOther={setOther}
              extra={extra}
              onExtra={setExtra}
              headingRef={headingRef}
              onNext={() => setStep(STEP.details)}
            />
          ) : null}
          {step === STEP.details ? (
            <DetailsStep
              siteId={site.id}
              occasion={occasion}
              couple={couple}
              name={name}
              onName={setName}
              contact={contact}
              onContact={setContact}
              language={language}
              onLanguage={setLanguage}
              images={images}
              onImages={setImages}
              problem={problem}
              headingRef={headingRef}
              onBack={() => setStep(STEP.questions)}
              onNext={goToLook}
            />
          ) : null}
          {step === STEP.look ? (
            <LookStep
              looks={looks}
              selected={direction}
              onChoose={choose}
              showAll={showAll}
              onShowAll={setShowAll}
              busy={busy}
              problem={problem}
              copiedFrom={data.remix?.name}
              headingRef={headingRef}
              onBack={() => setStep(STEP.details)}
              onNext={() => void plan()}
            />
          ) : null}
          {step === STEP.summary && brief ? (
            <SummaryStep
              brief={brief}
              direction={chosenDirection}
              language={language}
              busy={busy}
              problem={problem}
              headingRef={headingRef}
              onEdit={() => setStep(STEP.questions)}
              onCreate={() => void create()}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

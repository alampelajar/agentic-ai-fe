import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Contact, SiteImage } from '../data/api'
import { ImagePicker } from './image-picker'
import { Field, StepHeading, StepProblem } from './parts'

type DetailsStepProps = {
  siteId: number
  occasion: boolean
  couple: boolean
  name: string
  onName: (name: string) => void
  contact: Contact
  onContact: (contact: Contact) => void
  language: 'id' | 'en'
  onLanguage: (language: 'id' | 'en') => void
  images: SiteImage[]
  onImages: (images: SiteImage[]) => void
  problem: string | null
  headingRef: RefObject<HTMLHeadingElement | null>
  onBack: () => void
  onNext: () => void
}

/** Step 2: name, contact, the website's language, logo and photos. */
export function DetailsStep({
  siteId,
  occasion,
  couple,
  name,
  onName,
  contact,
  onContact,
  language,
  onLanguage,
  images,
  onImages,
  problem,
  headingRef,
  onBack,
  onNext,
}: DetailsStepProps) {
  const { t } = useTranslation()
  const setContactField = (field: keyof Contact, value: string) =>
    onContact({ ...contact, [field]: value })

  return (
    <section className='space-y-6'>
      <StepHeading
        refObject={headingRef}
        title={
          occasion
            ? t('siteBuilder.wizard.detailsTitleEvent')
            : t('siteBuilder.wizard.detailsTitle')
        }
        help={t('siteBuilder.wizard.detailsHelp')}
      />
      <div className='grid gap-4 sm:grid-cols-2'>
        <Field
          id='site-name'
          label={
            couple
              ? t('siteBuilder.wizard.nameCouple')
              : occasion
                ? t('siteBuilder.wizard.nameEvent')
                : t('siteBuilder.wizard.name')
          }
          className='sm:col-span-2'
        >
          <Input
            id='site-name'
            value={name}
            maxLength={100}
            required
            onChange={(event) => onName(event.target.value)}
          />
        </Field>
        <Field
          id='site-whatsapp'
          label={t('siteBuilder.wizard.whatsapp')}
          optional
        >
          <Input
            id='site-whatsapp'
            type='tel'
            inputMode='tel'
            value={contact.whatsapp}
            maxLength={40}
            onChange={(event) =>
              setContactField('whatsapp', event.target.value)
            }
          />
        </Field>
        <Field id='site-phone' label={t('siteBuilder.wizard.phone')} optional>
          <Input
            id='site-phone'
            type='tel'
            inputMode='tel'
            value={contact.phone}
            maxLength={40}
            onChange={(event) => setContactField('phone', event.target.value)}
          />
        </Field>
        <Field id='site-email' label={t('siteBuilder.wizard.email')} optional>
          <Input
            id='site-email'
            type='email'
            value={contact.email}
            maxLength={120}
            onChange={(event) => setContactField('email', event.target.value)}
          />
        </Field>
        {occasion ? null : (
          <Field id='site-hours' label={t('siteBuilder.wizard.hours')} optional>
            <Input
              id='site-hours'
              value={contact.hours}
              maxLength={200}
              placeholder={t('siteBuilder.wizard.hoursPlaceholder')}
              onChange={(event) => setContactField('hours', event.target.value)}
            />
          </Field>
        )}
        <Field
          id='site-address'
          label={
            occasion
              ? t('siteBuilder.wizard.addressEvent')
              : t('siteBuilder.wizard.address')
          }
          optional
          className='sm:col-span-2'
        >
          <Textarea
            id='site-address'
            value={contact.address}
            maxLength={300}
            rows={2}
            onChange={(event) => setContactField('address', event.target.value)}
          />
        </Field>
      </div>
      <fieldset className='space-y-2'>
        <legend className='text-sm font-medium'>
          {t('siteBuilder.wizard.languageLabel')}
        </legend>
        <p className='text-xs text-muted-foreground'>
          {t('siteBuilder.wizard.languageHelp')}
        </p>
        <div className='flex flex-wrap gap-2'>
          {(['id', 'en'] as const).map((code) => (
            <Button
              key={code}
              type='button'
              size='sm'
              variant={language === code ? 'default' : 'outline'}
              aria-pressed={language === code}
              onClick={() => onLanguage(code)}
            >
              {code === 'id'
                ? t('siteBuilder.wizard.languageId')
                : t('siteBuilder.wizard.languageEn')}
            </Button>
          ))}
        </div>
      </fieldset>
      <ImagePicker
        siteId={siteId}
        images={images}
        onChange={onImages}
        occasion={occasion}
      />
      <StepProblem problem={problem} />
      <div className='flex justify-between gap-2'>
        <Button variant='outline' onClick={onBack}>
          {t('siteBuilder.wizard.back')}
        </Button>
        <Button onClick={onNext}>{t('siteBuilder.wizard.next')}</Button>
      </div>
    </section>
  )
}

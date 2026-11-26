import { useId, useState, type FormEvent } from 'react'
import { Clock, ImageUp, Loader2, PencilLine, Send, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  sendTopUp,
  TopUpError,
  type Discount,
  type TopUp as TopUpSettings,
} from '../data/api'

export function rupiah(value: number, language: string): string {
  return new Intl.NumberFormat(language.startsWith('en') ? 'en-ID' : 'id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Buying credits by hand: choose a package, pay to the account shown, send the
 * screenshot of the payment. An admin checks it and adds the credits.
 */
export function TopUp({
  topup,
  discount,
  onSent,
}: {
  topup: TopUpSettings | null
  discount?: Discount | null
  onSent: () => void
}) {
  const { t, i18n } = useTranslation()
  const proofId = useId()
  const customId = useId()
  const [chosen, setChosen] = useState<number | 'custom' | null>(null)
  const [customText, setCustomText] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  if (!topup?.available) {
    return (
      <section
        aria-labelledby='top-up-title'
        className='flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-5 text-center'
      >
        <Wallet className='size-8 text-muted-foreground' />
        <h2 id='top-up-title' className='text-base font-semibold'>
          {t('creditsPage.topUpTitle')}
        </h2>
        <p className='inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400'>
          <Clock className='size-4' />
          {t('creditsPage.notYet')}
        </p>
        <p className='mx-auto max-w-sm text-sm text-muted-foreground'>
          {topup ? t('creditsPage.notYetHelp') : t('creditsPage.signInToTopUp')}
        </p>
      </section>
    )
  }

  const percent = discount?.percent ?? 0
  const min = topup.custom_min ?? 1
  const max = topup.custom_max ?? 1000
  const typed = /^\d+$/.test(customText.trim())
    ? Number(customText.trim())
    : NaN
  const customValid = typed >= min && typed <= max
  const credits = chosen === 'custom' ? (customValid ? typed : null) : chosen
  // Whole Rupiah, rounded down like the server.
  const pay = (amount: number) =>
    Math.floor((amount * topup.price_per_credit * (100 - percent)) / 100)

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (chosen === 'custom' && !customValid) {
      setProblem(t('creditsPage.customWrong', { min, max }))
      return
    }
    if (!credits) {
      setProblem(t('creditsPage.choosePackage'))
      return
    }
    if (!proof) {
      setProblem(t('creditsPage.needProof'))
      return
    }
    setSending(true)
    setProblem(null)
    try {
      await sendTopUp(credits, proof)
      toast.success(t('creditsPage.sent'))
      setChosen(null)
      setCustomText('')
      setProof(null)
      onSent()
    } catch (error) {
      const code = error instanceof TopUpError ? error.code : 'unknown'
      setProblem(
        t(`creditsPage.errors.${code}`, {
          defaultValue: t('creditsPage.errors.unknown'),
        })
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      onSubmit={send}
      noValidate
      aria-labelledby='top-up-title'
      className='space-y-5 rounded-xl border bg-card p-5'
    >
      <div className='flex items-center gap-2'>
        <Wallet className='size-4 text-muted-foreground' />
        <h2 id='top-up-title' className='text-base font-semibold'>
          {t('creditsPage.topUpTitle')}
        </h2>
      </div>

      {percent > 0 && discount?.until ? (
        <p
          role='status'
          className='rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400'
        >
          {t('creditsPage.discount', {
            percent,
            date: new Date(discount.until).toLocaleDateString(i18n.language, {
              day: 'numeric',
              month: 'long',
            }),
          })}
        </p>
      ) : null}

      <fieldset className='space-y-2'>
        <legend className='text-sm font-medium'>
          {t('creditsPage.step1')}
        </legend>
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
          {topup.packages.map((amount) => (
            <button
              key={amount}
              type='button'
              aria-pressed={chosen === amount}
              onClick={() => setChosen(amount)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                chosen === amount
                  ? 'border-primary bg-primary/10'
                  : 'hover:bg-accent'
              )}
            >
              <span className='block text-sm font-semibold'>
                {t('siteBuilder.credits.balance', { count: amount })}
              </span>
              <span className='block text-xs text-muted-foreground'>
                {percent > 0 ? (
                  <>
                    <s>
                      {rupiah(amount * topup.price_per_credit, i18n.language)}
                    </s>{' '}
                    <span className='font-medium text-foreground'>
                      {rupiah(pay(amount), i18n.language)}
                    </span>
                  </>
                ) : (
                  rupiah(pay(amount), i18n.language)
                )}
              </span>
            </button>
          ))}
          <button
            type='button'
            aria-pressed={chosen === 'custom'}
            onClick={() => setChosen('custom')}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              chosen === 'custom'
                ? 'border-primary bg-primary/10'
                : 'hover:bg-accent'
            )}
          >
            <span className='flex items-center gap-1 text-sm font-semibold'>
              <PencilLine className='size-4' />
              {t('creditsPage.custom')}
            </span>
            <span className='block text-xs text-muted-foreground'>
              {t('creditsPage.customHint')}
            </span>
          </button>
        </div>
        {chosen === 'custom' ? (
          <div className='space-y-1 pt-1'>
            <Label htmlFor={customId}>{t('creditsPage.customLabel')}</Label>
            <Input
              id={customId}
              type='number'
              inputMode='numeric'
              min={min}
              max={max}
              step={1}
              autoFocus
              value={customText}
              onChange={(event) => setCustomText(event.target.value)}
              className='sm:max-w-48'
            />
            <p className='text-xs text-muted-foreground'>
              {t('creditsPage.customHelp', {
                min,
                max,
                price: rupiah(topup.price_per_credit, i18n.language),
              })}
            </p>
          </div>
        ) : null}
      </fieldset>

      <div className='space-y-2'>
        <p className='text-sm font-medium'>{t('creditsPage.step2')}</p>
        <div className='rounded-lg bg-muted p-3 text-sm whitespace-pre-line'>
          {topup.payment_info}
        </div>
        {credits ? (
          <p className='text-sm'>
            {t('creditsPage.total')}{' '}
            <span className='font-semibold'>
              {rupiah(pay(credits), i18n.language)}
            </span>
          </p>
        ) : null}
      </div>

      <div className='space-y-2'>
        <Label htmlFor={proofId}>{t('creditsPage.step3')}</Label>
        <label
          htmlFor={proofId}
          className='flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-accent'
        >
          <ImageUp className='size-4 shrink-0 text-muted-foreground' />
          <span className='min-w-0 truncate'>
            {proof ? proof.name : t('creditsPage.chooseProof')}
          </span>
          <input
            id={proofId}
            type='file'
            accept='image/png,image/jpeg,image/webp'
            className='sr-only'
            onChange={(event) => setProof(event.target.files?.[0] ?? null)}
          />
        </label>
        <p className='text-xs text-muted-foreground'>
          {t('creditsPage.proofHelp')}
        </p>
      </div>

      {problem ? (
        <p role='alert' className='text-sm text-destructive'>
          {problem}
        </p>
      ) : null}

      <Button type='submit' disabled={sending} className='w-full sm:w-auto'>
        {sending ? (
          <Loader2 className='size-4 animate-spin' />
        ) : (
          <Send className='size-4' />
        )}
        {sending ? t('creditsPage.sending') : t('creditsPage.send')}
      </Button>
    </form>
  )
}

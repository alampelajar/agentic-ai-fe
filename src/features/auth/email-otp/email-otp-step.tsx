import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, MailCheck, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'

type EmailOtpStepProps = {
  /** The address the code was sent to. */
  email: string
  /** Seconds before "resend" is allowed; the server enforces the same gap. */
  initialSeconds?: number
  verifyLabel?: string
  onVerify: (code: string) => Promise<void>
  onResend: () => Promise<void>
  onBack?: () => void
}

/** Six-digit code entry shared by sign-up and change-email. */
export function EmailOtpStep({ email, initialSeconds = 60, verifyLabel, onVerify, onResend, onBack }: EmailOtpStepProps) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [seconds, setSeconds] = useState(initialSeconds)

  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setTimeout(() => setSeconds((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [seconds])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (code.length !== 6 || busy) return
    setBusy(true)
    try {
      await onVerify(code)
    } catch (error) {
      setCode('')
      toast.error(error instanceof Error ? error.message : t('emailOtp.verifyFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    if (seconds > 0 || busy) return
    setBusy(true)
    try {
      await onResend()
      setCode('')
      setSeconds(60)
      toast.success(t('emailOtp.resent'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('emailOtp.resendFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className='grid gap-4'>
      <div className='flex items-start gap-3'>
        <MailCheck className='mt-0.5 size-5 shrink-0 text-primary' />
        <p className='text-sm leading-6 text-muted-foreground'>
          {t('emailOtp.sentTo')} <span className='font-medium text-foreground'>{email}</span>
        </p>
      </div>

      <InputOTP aria-label={t('emailOtp.code')} maxLength={6} value={code} onChange={setCode} containerClassName='justify-between'>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>

      <Button type='submit' disabled={code.length !== 6 || busy}>
        {busy ? <Loader2 className='size-4 animate-spin' /> : <ShieldCheck className='size-4' />}
        {verifyLabel ?? t('emailOtp.verify')}
      </Button>

      <div className='flex items-center justify-between text-sm'>
        <Button type='button' variant='ghost' className='h-8 px-0 hover:bg-transparent' disabled={seconds > 0 || busy} onClick={resend}>
          {seconds > 0 ? t('emailOtp.resendIn', { seconds }) : t('emailOtp.resend')}
        </Button>
        {onBack && (
          <Button type='button' variant='ghost' className='h-8 px-0 text-muted-foreground hover:bg-transparent' disabled={busy} onClick={onBack}>
            {t('emailOtp.back')}
          </Button>
        )}
      </div>
    </form>
  )
}

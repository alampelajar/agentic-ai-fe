import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Loader2, MailCheck, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081').replace(/\/$/, '')

type ApiResponse = {
  ok?: boolean
  code?: string
  message?: string
  reset_token?: string
}

type OtpFormProps = React.HTMLAttributes<HTMLDivElement> & {
  initialEmail?: string
}

export function OtpForm({
  initialEmail = '',
  className,
  ...props
}: OtpFormProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [stage, setStage] = useState<'otp' | 'password'>('otp')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(initialEmail ? 60 : 0)

  useEffect(() => {
    if (stage !== 'otp' || resendSeconds <= 0) return
    const timer = window.setTimeout(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [resendSeconds, stage])

  function getErrorMessage(code: string | undefined, fallback: string) {
    if (code === 'password_reset_unavailable') return t('passwordReset.errors.unavailable')
    if (code === 'invalid_otp') return t('passwordReset.errors.invalidOtp')
    if (code === 'too_many_attempts') return t('passwordReset.errors.tooManyAttempts')
    if (code === 'invalid_reset_token') return t('passwordReset.errors.invalidResetToken')
    if (code === 'password_too_short') return t('passwordReset.errors.passwordTooShort')
    if (code === 'password_too_long') return t('passwordReset.errors.passwordTooLong')
    if (code === 'password_mismatch') return t('passwordReset.errors.passwordMismatch')
    return fallback
  }

  async function handleResend() {
    if (!email.trim() || resendSeconds > 0 || isLoading) return
    setIsLoading(true)

    try {
      const response = await fetch(API_BASE_URL + '/api/auth/forgot-password/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim() }),
      })
      const result: ApiResponse = await response.json().catch(() => ({}))
      if (!response.ok || result.ok !== true) {
        throw new Error(getErrorMessage(result.code, t('passwordReset.errors.requestFailed')))
      }

      setOtp('')
      setResendSeconds(60)
      toast.success(t('passwordReset.otp.resendSuccess'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('passwordReset.errors.requestFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !otp || isLoading) return

    setIsLoading(true)
    try {
      const response = await fetch(API_BASE_URL + '/api/auth/forgot-password/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), otp }),
      })
      const result: ApiResponse = await response.json().catch(() => ({}))
      if (!response.ok || result.ok !== true || !result.reset_token) {
        throw new Error(getErrorMessage(result.code, t('passwordReset.errors.verifyFailed')))
      }

      setResetToken(result.reset_token)
      setOtp('')
      setStage('password')
      toast.success(t('passwordReset.otp.verified'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('passwordReset.errors.verifyFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newPassword.length < 8) {
      toast.error(t('passwordReset.errors.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordReset.errors.passwordMismatch'))
      return
    }
    if (isLoading) return

    setIsLoading(true)
    try {
      const response = await fetch(API_BASE_URL + '/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          reset_token: resetToken,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      })
      const result: ApiResponse = await response.json().catch(() => ({}))
      if (!response.ok || result.ok !== true) {
        throw new Error(getErrorMessage(result.code, t('passwordReset.errors.resetFailed')))
      }

      toast.success(t('passwordReset.newPassword.success'))
      navigate({ to: '/sign-in', replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('passwordReset.errors.resetFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={'w-full ' + (className ?? '')} {...props}>
      {stage === 'otp' ? (
        <>
          <div className='mb-7'>
            <div className='mb-5 flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/[0.08] text-primary'>
              <MailCheck className='size-5' />
            </div>
            <p className='mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground'>
              {t('passwordReset.eyebrow')}
            </p>
            <h1 className='text-2xl font-semibold tracking-tight sm:text-[1.75rem]'>
              {t('passwordReset.otp.title')}
            </h1>
            <p className='mt-2 text-sm leading-6 text-muted-foreground'>
              {t('passwordReset.otp.description')}
            </p>
          </div>

          <form onSubmit={handleVerify} className='space-y-5'>
            <div className='space-y-2'>
              <Label htmlFor='reset-email' className='text-sm font-medium'>
                {t('passwordReset.request.email')}
              </Label>
              <Input
                id='reset-email'
                name='email'
                type='email'
                autoComplete='email'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className='h-11 rounded-md border-white/10 bg-white/[0.035] px-3.5 text-sm shadow-none'
              />
            </div>

            <div className='space-y-3'>
              <Label htmlFor='reset-otp' className='text-sm font-medium'>
                {t('passwordReset.otp.code')}
              </Label>
              <InputOTP
                id='reset-otp'
                aria-label={t('passwordReset.otp.code')}
                maxLength={6}
                value={otp}
                onChange={setOtp}
                containerClassName='justify-between'
              >
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
            </div>

            <Button type='submit' className='h-11 w-full rounded-md font-medium shadow-none' disabled={otp.length !== 6 || !email.trim() || isLoading}>
              {isLoading ? <Loader2 className='size-4 animate-spin' /> : <ShieldCheck className='size-4' />}
              {isLoading ? t('passwordReset.otp.verifying') : t('passwordReset.otp.verify')}
            </Button>
          </form>

          <div className='mt-6 flex flex-col items-start gap-2 border-t border-white/[0.08] pt-5 text-sm'>
            <p className='text-muted-foreground'>{t('passwordReset.otp.didNotReceive')}</p>
            <Button type='button' variant='ghost' className='h-9 px-0 text-sm text-foreground hover:bg-transparent' disabled={!email.trim() || resendSeconds > 0 || isLoading} onClick={handleResend}>
              {isLoading ? <Loader2 className='size-4 animate-spin' /> : <ArrowRight className='size-4' />}
              {resendSeconds > 0
                ? t('passwordReset.otp.resendCountdown', { seconds: resendSeconds })
                : t('passwordReset.otp.resend')}
            </Button>
            <Button type='button' variant='ghost' className='h-8 px-0 text-xs text-muted-foreground hover:bg-transparent' onClick={() => navigate({ to: '/forgot-password' })}>
              <ArrowLeft className='size-3.5' />
              {t('passwordReset.backToEmail')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className='mb-7'>
            <div className='mb-5 flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/[0.08] text-primary'>
              <ShieldCheck className='size-5' />
            </div>
            <p className='mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground'>
              {t('passwordReset.eyebrow')}
            </p>
            <h1 className='text-2xl font-semibold tracking-tight sm:text-[1.75rem]'>
              {t('passwordReset.newPassword.title')}
            </h1>
            <p className='mt-2 text-sm leading-6 text-muted-foreground'>
              {t('passwordReset.newPassword.description')}
            </p>
          </div>

          <form onSubmit={handleReset} className='space-y-5'>
            <div className='space-y-2'>
              <Label htmlFor='new-password' className='text-sm font-medium'>
                {t('passwordReset.newPassword.password')}
              </Label>
              <Input
                id='new-password'
                name='new-password'
                type='password'
                autoComplete='new-password'
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                className='h-11 rounded-md border-white/10 bg-white/[0.035] px-3.5 text-sm shadow-none'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='confirm-password' className='text-sm font-medium'>
                {t('passwordReset.newPassword.confirmPassword')}
              </Label>
              <Input
                id='confirm-password'
                name='confirm-password'
                type='password'
                autoComplete='new-password'
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                className='h-11 rounded-md border-white/10 bg-white/[0.035] px-3.5 text-sm shadow-none'
              />
            </div>
            <Button type='submit' className='h-11 w-full rounded-md font-medium shadow-none' disabled={isLoading}>
              {isLoading ? <Loader2 className='size-4 animate-spin' /> : <ShieldCheck className='size-4' />}
              {isLoading ? t('passwordReset.newPassword.saving') : t('passwordReset.newPassword.submit')}
            </Button>
          </form>
        </>
      )}
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { LoaderCircle, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmailOtpStep } from '@/features/auth/email-otp/email-otp-step'
import { requestChangeEmailOtp, resendChangeEmailOtp, verifyChangeEmailOtp } from '@/lib/api-email-otp'
import { useAuthStore } from '@/stores/auth-store'

export function ChangeEmailCard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const currentEmail = useAuthStore((state) => state.auth.user?.email ?? '')
  const [stage, setStage] = useState<'form' | 'otp'>('form')
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    setSending(true)
    try {
      await requestChangeEmailOtp({ new_email: newEmail.trim(), password })
      setStage('otp')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('changeEmail.failure'))
    } finally {
      setSending(false)
    }
  }

  async function verify(code: string) {
    await verifyChangeEmailOtp(newEmail.trim(), code)
    toast.success(t('changeEmail.success'))
    // The server revoked every session, so sign in again with the new address.
    useAuthStore.getState().auth.reset()
    void navigate({ to: '/sign-in', replace: true })
  }

  return (
    <section className='min-w-0 rounded-xl border p-5'>
      <div className='mb-4 flex items-center gap-2'>
        <Mail className='size-4 text-muted-foreground' />
        <h3 className='font-semibold'>{t('changeEmail.title')}</h3>
      </div>
      <p className='mb-4 text-sm leading-6 text-muted-foreground'>
        {t('changeEmail.description', { email: currentEmail })}
      </p>

      {stage === 'form' ? (
        <form onSubmit={start} className='grid gap-4'>
          <div className='space-y-2'>
            <label htmlFor='new-email' className='text-sm font-medium'>{t('changeEmail.newEmail')}</label>
            <Input id='new-email' type='email' autoComplete='email' required value={newEmail} onChange={(event) => setNewEmail(event.target.value)} disabled={sending} />
          </div>
          <div className='space-y-2'>
            <label htmlFor='change-email-password' className='text-sm font-medium'>{t('changeEmail.password')}</label>
            <Input id='change-email-password' type='password' autoComplete='current-password' required value={password} onChange={(event) => setPassword(event.target.value)} disabled={sending} />
          </div>
          <Button type='submit' disabled={sending || !newEmail.trim() || !password}>
            {sending && <LoaderCircle className='size-4 animate-spin' />}
            {t('changeEmail.sendCode')}
          </Button>
        </form>
      ) : (
        <EmailOtpStep
          email={newEmail.trim()}
          verifyLabel={t('changeEmail.confirm')}
          onVerify={verify}
          onResend={async () => {
            await resendChangeEmailOtp(newEmail.trim())
          }}
          onBack={() => setStage('form')}
        />
      )}
    </section>
  )
}

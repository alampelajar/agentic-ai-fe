import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { API_BASE_URL } from '@/lib/api/config'
import { emailRefusalKey } from '@/lib/api/email-otp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'
import { readPendingDeletion, type PendingDeletion } from '../data/api'
import { clearSignInPrefill, peekSignInPrefill } from '../lib/prefill'
import { PendingDeletionNotice } from './pending-deletion-notice'

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  redirectTo?: string
}

interface LoginResponse {
  ok: boolean
  message: string
  code?: string
  deletes_at?: string
  appeal_token?: string
  access_token?: string
  user?: {
    id: number
    name: string
    email: string
    avatar?: string
  }
}

interface GoogleLoginResponse {
  ok: boolean
  message: string
  code?: string
  deletes_at?: string
  appeal_token?: string
  access_token?: string
  user?: {
    id: number
    name: string
    email: string
    avatar?: string
  }
}

export function UserAuthForm({
  redirectTo,
  className,
  ...props
}: UserAuthFormProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const auth = useAuthStore((state) => state.auth)

  // Right after sign-up the page opens with the details the person just entered.
  const [prefill] = useState(peekSignInPrefill)
  const [email, setEmail] = useState(prefill?.email ?? '')
  const [password, setPassword] = useState(prefill?.password ?? '')
  useEffect(() => {
    clearSignInPrefill()
  }, [])
  const [isLoading, setIsLoading] = useState(false)
  // Set when the account exists but waits to be deleted: a notice replaces the form.
  const [pending, setPending] = useState<PendingDeletion | null>(null)

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim()) {
      toast.error(t('authPage.errors.emailRequired'))
      return
    }

    if (!password) {
      toast.error(t('authPage.errors.passwordRequired'))
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(API_BASE_URL + '/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const result: LoginResponse = await response.json()

      const pendingDeletion = readPendingDeletion(response.status, result)
      if (pendingDeletion) {
        setPassword('')
        setPending(pendingDeletion)
        return
      }

      if (!response.ok || !result.ok || !result.access_token || !result.user) {
        throw new Error(
          result.message || t('authPage.errors.invalidCredentials')
        )
      }

      const user = {
        accountNo: `USER_${result.user.id}`,
        email: result.user.email,
        role: ['user'],
        exp: Date.now() + 15 * 60 * 1000,
        name: result.user.name,
        avatar: result.user.avatar || '',
      }

      auth.setUser(user)
      auth.setAccessToken(result.access_token)

      toast.success(t('authPage.toasts.loginSuccess'), {
        description: t('authPage.toasts.welcome', { name: result.user.name }),
      })

      navigate({
        to: (redirectTo as '/overview') || '/overview',
        replace: true,
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('authPage.errors.loginUnexpected')
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleSuccess(credentialResponse: CredentialResponse) {
    if (!credentialResponse.credential) {
      toast.error(t('authPage.errors.googleFailed'))
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(API_BASE_URL + '/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ credential: credentialResponse.credential }),
      })

      const result: GoogleLoginResponse = await response.json()

      const pendingDeletion = readPendingDeletion(response.status, result)
      if (pendingDeletion) {
        setPending(pendingDeletion)
        return
      }

      // A new account from Google follows the sign-up rules for its address.
      const refusalKey = emailRefusalKey(result.code)
      if (refusalKey) {
        throw new Error(t(refusalKey))
      }
      if (!response.ok || !result.ok || !result.access_token || !result.user) {
        throw new Error(result.message || t('authPage.errors.googleFailed'))
      }

      const user = {
        accountNo: `USER_${result.user.id}`,
        email: result.user.email,
        role: ['user'],
        exp: Date.now() + 15 * 60 * 1000,
        name: result.user.name,
        avatar: result.user.avatar || '',
      }

      auth.setAccessToken(result.access_token)
      auth.setUser(user)

      toast.success(t('authPage.toasts.googleLoginSuccess'), {
        description: t('authPage.toasts.welcome', { name: result.user.name }),
      })

      navigate({
        to: (redirectTo as '/overview') || '/overview',
        replace: true,
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('authPage.errors.googleFailed')
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleGoogleError() {
    toast.error(t('authPage.errors.googleFailed'))
  }

  if (pending) {
    return (
      <div className={`w-full ${className ?? ''}`} {...props}>
        <PendingDeletionNotice
          pending={pending}
          onBack={() => setPending(null)}
        />
      </div>
    )
  }

  return (
    <div className={`w-full ${className ?? ''}`} {...props}>
      <form onSubmit={handleLogin} className='space-y-5'>
        <div className='space-y-2'>
          <Label htmlFor='email' className='text-sm font-medium'>
            {t('authPage.fields.email')}
          </Label>
          <Input
            id='email'
            name='email'
            type='email'
            placeholder={t('authPage.fields.emailPlaceholder')}
            autoComplete='email'
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isLoading}
            className='h-11 px-3.5'
          />
        </div>

        <div className='space-y-2'>
          <div className='flex items-center justify-between gap-3'>
            <Label htmlFor='password' className='text-sm font-medium'>
              {t('authPage.fields.password')}
            </Label>
            <Link
              to='/forgot-password'
              className='text-xs text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground'
            >
              {t('authPage.fields.forgotPassword')}
            </Link>
          </div>
          <PasswordInput
            id='password'
            name='password'
            placeholder='••••••••'
            autoComplete='current-password'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isLoading}
            inputClassName='h-11 px-3.5'
          />
        </div>

        <Button
          type='submit'
          disabled={isLoading}
          className='h-11 w-full rounded-md font-medium shadow-none transition-colors'
        >
          {isLoading && <Loader2 className='size-4 animate-spin' />}
          {isLoading
            ? t('authPage.fields.signingIn')
            : t('authPage.fields.signIn')}
        </Button>
      </form>

      <div className='relative my-6'>
        <div className='absolute inset-0 flex items-center'>
          <span className='w-full border-t' />
        </div>
        <div className='relative flex justify-center'>
          <span className='bg-background px-3 text-xs font-medium tracking-wider text-muted-foreground uppercase'>
            {t('authPage.fields.orContinueWith')}
          </span>
        </div>
      </div>

      <div className='flex min-h-11 w-full items-center justify-center [&>div]:max-w-full'>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          useOneTap={false}
          theme='filled_black'
          size='large'
          width='100%'
          text='continue_with'
          shape='rectangular'
        />
      </div>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/stores/auth-store'
import { API_BASE_URL } from '@/lib/api-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  redirectTo?: string
}

interface LoginResponse {
  ok: boolean
  message: string
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

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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

      if (!response.ok || !result.ok || !result.access_token || !result.user) {
        throw new Error(result.message || t('authPage.errors.invalidCredentials'))
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
        error instanceof Error ? error.message : t('authPage.errors.loginUnexpected'),
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
        error instanceof Error ? error.message : t('authPage.errors.googleFailed'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleGoogleError() {
    toast.error(t('authPage.errors.googleFailed'))
  }

  return (
    <div className={`w-full ${className ?? ''}`} {...props}>
      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-zinc-200">
            {t('authPage.fields.email')}
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t('authPage.fields.emailPlaceholder')}
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isLoading}
            className="h-11 rounded-md border-white/10 bg-white/[0.035] px-3.5 text-sm shadow-none placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password" className="text-sm font-medium text-zinc-200">
              {t('authPage.fields.password')}
            </Label>
            <Link
              to="/forgot-password"
              className="text-xs text-zinc-400 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-white"
            >
              {t('authPage.fields.forgotPassword')}
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isLoading}
            className="h-11 rounded-md border-white/10 bg-white/[0.035] px-3.5 text-sm shadow-none placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full rounded-md font-medium shadow-none transition-colors"
        >
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          {isLoading ? t('authPage.fields.signingIn') : t('authPage.fields.signIn')}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/[0.09]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#090a0c] px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
            {t('authPage.fields.orContinueWith')}
          </span>
        </div>
      </div>

      <div className="flex min-h-11 w-full items-center justify-center [&>div]:max-w-full">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          useOneTap={false}
          theme="filled_black"
          size="large"
          width="100%"
          text="continue_with"
          shape="rectangular"
        />
      </div>
    </div>
  )
}

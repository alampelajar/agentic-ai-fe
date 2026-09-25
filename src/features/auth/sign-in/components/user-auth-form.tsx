import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  GoogleLogin,
  type CredentialResponse,
} from '@react-oauth/google'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UserAuthFormProps
  extends React.HTMLAttributes<HTMLDivElement> {
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

  const auth = useAuthStore(
    (state) => state.auth
  )

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] =
    useState(false)

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!email.trim()) {
      toast.error('Email wajib diisi.')
      return
    }

    if (!password) {
      toast.error('Password wajib diisi.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(
        'http://localhost:8080/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      )

      const result: LoginResponse =
        await response.json()

      if (
        !response.ok ||
        !result.ok ||
        !result.access_token ||
        !result.user
      ) {
        throw new Error(
          result.message ||
            'Email atau password salah.'
        )
      }

      const user = {
        accountNo: `USER_${result.user.id}`,
        email: result.user.email,
        role: ['user'],
        exp:
          Date.now() +
          15 * 60 * 1000,
        name: result.user.name,
        avatar:
          result.user.avatar || '',
      }

      auth.setUser(user)
      auth.setAccessToken(
        result.access_token
      )

      toast.success('Login berhasil', {
        description: `Selamat datang, ${result.user.name}.`,
      })

      navigate({
        to:
          (redirectTo as '/overview') ||
          '/overview',
        replace: true,
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat login.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleSuccess(
    credentialResponse: CredentialResponse
  ) {
    if (!credentialResponse.credential) {
      toast.error(
        'Google authentication gagal.'
      )
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(
        'http://localhost:8080/api/auth/google',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            credential:
              credentialResponse.credential,
          }),
        }
      )

      const result: GoogleLoginResponse =
        await response.json()

      if (
        !response.ok ||
        !result.ok ||
        !result.access_token ||
        !result.user
      ) {
        throw new Error(
          result.message ||
            'Google authentication gagal.'
        )
      }

      const user = {
        accountNo: `USER_${result.user.id}`,
        email: result.user.email,
        role: ['user'],
        exp:
          Date.now() +
          15 * 60 * 1000,
        name: result.user.name,
        avatar:
          result.user.avatar || '',
      }

      auth.setAccessToken(
        result.access_token
      )

      auth.setUser(user)

      toast.success(
        'Google login berhasil',
        {
          description: `Selamat datang, ${result.user.name}.`,
        }
      )

      navigate({
        to:
          (redirectTo as '/overview') ||
          '/overview',
        replace: true,
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Google authentication gagal.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleGoogleError() {
    toast.error(
      'Google authentication gagal.'
    )
  }

  return (
    <div
      className={`w-full ${
        className ?? ''
      }`}
      {...props}
    >
      <form
        onSubmit={handleLogin}
        className="space-y-4"
      >
        {/* Email */}
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-sm font-medium"
          >
            Email
          </Label>

          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            disabled={isLoading}
            className="h-11 rounded-xl border-border/70 bg-background/60 px-3.5 transition-all focus-visible:ring-1"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-sm font-medium"
            >
              Password
            </Label>

            <button
              type="button"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={() =>
                toast.info(
                  'Fitur reset password belum tersedia.'
                )
              }
            >
              Forgot password?
            </button>
          </div>

          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            disabled={isLoading}
            className="h-11 rounded-xl border-border/70 bg-background/60 px-3.5 transition-all focus-visible:ring-1"
          />
        </div>

        {/* Sign In */}
        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full rounded-xl font-medium transition-all"
        >
          {isLoading && (
            <Loader2 className="size-4 animate-spin" />
          )}

          {isLoading
            ? 'Signing in...'
            : 'Sign In'}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>

        <div className="relative flex justify-center">
          <span className="bg-card px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {/* Google */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-background/30">
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
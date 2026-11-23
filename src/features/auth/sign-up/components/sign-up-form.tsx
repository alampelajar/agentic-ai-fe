import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { Loader2, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  emailRefusalKey,
  OtpRequestError,
  requestRegisterOtp,
  resendRegisterOtp,
  verifyRegisterOtp,
} from '@/lib/api-email-otp'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { EmailOtpStep } from '@/features/auth/email-otp/email-otp-step'
import { setSignInPrefill } from '@/features/auth/sign-in/prefill'

// Built with t() so the messages follow the chosen language.
function makeFormSchema(t: TFunction) {
  return z
    .object({
      name: z
        .string()
        .min(1, t('signUpPage.validation.nameRequired'))
        .min(2, t('signUpPage.validation.nameShort')),

      email: z.email({
        error: (iss) =>
          iss.input === ''
            ? t('signUpPage.validation.emailRequired')
            : undefined,
      }),

      password: z
        .string()
        .min(1, t('signUpPage.validation.passwordRequired'))
        .min(8, t('signUpPage.validation.passwordShort')),

      confirmPassword: z
        .string()
        .min(1, t('signUpPage.validation.confirmRequired')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('signUpPage.validation.mismatch'),
      path: ['confirmPassword'],
    })
}

type SignUpValues = z.infer<ReturnType<typeof makeFormSchema>>

export function SignUpForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  // After the form is accepted a code is e-mailed; the account exists only once it is entered.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const formSchema = useMemo(() => makeFormSchema(t), [t])
  const form = useForm<SignUpValues>({
    resolver: zodResolver(formSchema),

    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  // The fields are disabled while the request runs, so a refusal from the server
  // moves the focus to the email field only once they are usable again.
  const emailRefused = form.formState.errors.email?.type === 'server'
  useEffect(() => {
    if (!isLoading && emailRefused) form.setFocus('email')
  }, [isLoading, emailRefused, form])

  async function onSubmit(data: SignUpValues) {
    setIsLoading(true)

    try {
      const email = data.email.trim()

      await requestRegisterOtp({
        name: data.name.trim(),
        email,
        password: data.password,
      })

      setPendingEmail(email)
    } catch (error) {
      // An address the server will not take is a problem with the field: say it there.
      const refusalKey = error instanceof OtpRequestError ? emailRefusalKey(error.code) : undefined
      if (refusalKey) {
        form.setError('email', { type: 'server', message: t(refusalKey) })
        return
      }
      toast.error(
        error instanceof Error
          ? error.message
          : t('signUpPage.validation.failed')
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function verifyCode(code: string) {
    if (!pendingEmail) return

    await verifyRegisterOtp(pendingEmail, code)

    toast.success(t('signUpPage.form.created'), {
      description: t('signUpPage.form.createdFor', { email: pendingEmail }),
    })

    // Hand the details to the sign-in page (in memory only) so it opens already filled in.
    setSignInPrefill({
      email: pendingEmail,
      password: form.getValues('password'),
    })
    form.reset()
    await navigate({ to: '/sign-in', replace: true })
  }

  if (pendingEmail) {
    return (
      <EmailOtpStep
        email={pendingEmail}
        verifyLabel={t('emailOtp.createAccount')}
        onVerify={verifyCode}
        onResend={async () => {
          await resendRegisterOtp(pendingEmail)
        }}
        onBack={() => setPendingEmail(null)}
      />
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3.5', className)}
        {...props}
      >
        {/* Name */}
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('signUpPage.form.name')}</FormLabel>

              <FormControl>
                <Input
                  placeholder={t('signUpPage.form.namePlaceholder')}
                  autoComplete='name'
                  disabled={isLoading}
                  className='h-10 px-3.5'
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('signUpPage.form.email')}</FormLabel>

              <FormControl>
                <Input
                  placeholder='name@example.com'
                  type='email'
                  autoComplete='email'
                  disabled={isLoading}
                  className='h-10 px-3.5'
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password */}
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('signUpPage.form.password')}</FormLabel>

              <FormControl>
                <PasswordInput
                  placeholder='••••••••'
                  autoComplete='new-password'
                  disabled={isLoading}
                  className='h-10'
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* Confirm Password */}
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('signUpPage.form.confirmPassword')}</FormLabel>

              <FormControl>
                <PasswordInput
                  placeholder='••••••••'
                  autoComplete='new-password'
                  disabled={isLoading}
                  className='h-10'
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* Create Account */}
        <Button
          type='submit'
          disabled={isLoading}
          className='mt-1 h-10 w-full font-medium'
        >
          {isLoading ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <UserPlus className='size-4' />
          )}

          {isLoading
            ? t('signUpPage.form.creating')
            : t('signUpPage.form.submit')}
        </Button>
      </form>
    </Form>
  )
}

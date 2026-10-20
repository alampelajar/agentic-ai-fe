import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

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
import { API_BASE_URL } from '@/lib/api-config'

type ForgotPasswordValues = {
  email: string
}

export function ForgotPasswordForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)

  const formSchema = useMemo(
    () =>
      z.object({
        email: z.email({
          error: (issue) =>
            issue.input === ''
              ? t('passwordReset.errors.emailRequired')
              : t('passwordReset.errors.emailInvalid'),
        }),
      }),
    [t],
  )

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: ForgotPasswordValues) {
    setIsLoading(true)

    try {
      const response = await fetch(API_BASE_URL + '/api/auth/forgot-password/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: data.email.trim() }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok || result.ok !== true) {
        const message =
          result.code === 'password_reset_unavailable'
            ? t('passwordReset.errors.unavailable')
            : t('passwordReset.errors.requestFailed')
        throw new Error(message)
      }

      toast.success(t('passwordReset.request.genericSuccess'))
      form.reset()
      navigate({
        to: '/otp',
        search: { email: data.email.trim() },
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('passwordReset.errors.requestFailed'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={'grid gap-5 ' + (className ?? '')}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-sm font-medium'>
                {t('passwordReset.request.email')}
              </FormLabel>
              <FormControl>
                <Input
                  type='email'
                  autoComplete='email'
                  placeholder={t('passwordReset.request.emailPlaceholder')}
                  className='h-11 rounded-md border-white/10 bg-white/[0.035] px-3.5 text-sm shadow-none placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-primary/20'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='h-11 w-full rounded-md font-medium shadow-none' disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className='size-4 animate-spin' />
              {t('passwordReset.request.sending')}
            </>
          ) : (
            <>
              {t('passwordReset.request.submit')}
              <ArrowRight className='size-4' />
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}

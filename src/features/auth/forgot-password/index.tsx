import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AuthLayout } from '../auth-layout'
import { ForgotPasswordForm } from './components/forgot-password-form'

export function ForgotPassword() {
  const { t } = useTranslation()

  return (
    <AuthLayout>
      <div className='w-full'>
        <Link
          to='/sign-in'
          className='mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground'
        >
          <ArrowLeft className='size-4' />
          {t('passwordReset.backToSignIn')}
        </Link>

        <div className='mb-7'>
          <p className='mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            {t('passwordReset.eyebrow')}
          </p>
          <h1 className='text-2xl font-semibold tracking-tight sm:text-[1.75rem]'>
            {t('passwordReset.request.title')}
          </h1>
          <p className='mt-2 text-sm leading-6 text-muted-foreground'>
            {t('passwordReset.request.description')}
          </p>
        </div>

        <ForgotPasswordForm />

        <p className='mt-7 border-t border-white/[0.08] pt-5 text-xs leading-5 text-muted-foreground'>
          {t('passwordReset.securityNote')}
        </p>
      </div>
    </AuthLayout>
  )
}

import { Link } from '@tanstack/react-router'
import { ArrowUpRight, CheckCircle2, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '../components/auth-layout'
import { SignUpForm } from './components/sign-up-form'

export function SignUp() {
  const { t } = useTranslation()
  return (
    <AuthLayout>
      <div className='w-full'>
        {/* Sign Up Card */}
        <div className='rounded-xl border bg-card p-5 text-card-foreground sm:p-6'>
          {/* Header */}
          <div className='mb-4 text-center'>
            <div className='mx-auto mb-2.5 flex size-8 items-center justify-center rounded-lg bg-primary/10'>
              <UserPlus className='size-4 text-primary' />
            </div>

            <h2 className='text-lg font-semibold tracking-tight'>
              {t('signUpPage.title')}
            </h2>

            <p className='mx-auto mt-1 max-w-xs text-xs leading-4.5 text-muted-foreground'>
              {t('signUpPage.description')}
            </p>
          </div>

          {/* Existing Sign Up Form */}
          <SignUpForm />

          {/* Sign In */}
          <div className='mt-4 border-t pt-4 text-center'>
            <p className='text-xs text-muted-foreground'>
              {t('signUpPage.haveAccount')}
            </p>

            <Link
              to='/sign-in'
              className='mt-1 inline-flex cursor-pointer items-center justify-center text-sm font-medium text-foreground transition-colors hover:text-primary'
            >
              {t('signUpPage.signIn')}
            </Link>
          </div>
        </div>

        {/* Small info */}
        <div className='mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground'>
          <CheckCircle2 className='size-3 text-emerald-600 dark:text-emerald-400' />
          <span>{t('signUpPage.secure')}</span>
        </div>

        <div className='mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground'>
          <span>{t('signUpPage.poweredBy')}</span>
          <ArrowUpRight className='size-2.5' />
        </div>
      </div>
    </AuthLayout>
  )
}

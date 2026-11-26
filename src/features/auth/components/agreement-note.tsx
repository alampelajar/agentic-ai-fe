import { Link } from '@tanstack/react-router'
import { Trans } from 'react-i18next'
import { cn } from '@/lib/utils'

// The line under the sign-in and sign-up forms: making an account (with a password,
// a code or Google) means agreeing to the terms and the privacy policy. The links
// open in a new tab, so what was typed in the form stays.

const linkClass =
  'rounded-sm font-medium text-foreground underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

export function AgreementNote({ className }: { className?: string }) {
  return (
    <p className={cn('text-xs leading-5 text-muted-foreground', className)}>
      <Trans
        i18nKey='authLayout.agreement'
        components={{
          terms: (
            <Link
              to='/docs/terms'
              target='_blank'
              rel='noreferrer'
              className={linkClass}
            />
          ),
          privacy: (
            <Link
              to='/docs/privacy'
              target='_blank'
              rel='noreferrer'
              className={linkClass}
            />
          ),
        }}
      />
    </p>
  )
}

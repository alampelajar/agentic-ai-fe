import { ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Shown on the sign-in page when an admin suspended the account, with the reason. */
export function SuspendedNotice({ reason }: { reason: string }) {
  const { t } = useTranslation()
  return (
    <div
      role='alert'
      className='mb-5 flex gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-left text-destructive'
    >
      <ShieldAlert className='mt-0.5 size-5 shrink-0' />
      <div className='space-y-1'>
        <p className='text-sm font-semibold'>{t('authPage.suspended.title')}</p>
        {reason ? (
          <p className='text-sm'>
            {t('authPage.suspended.reason', { reason })}
          </p>
        ) : null}
        <p className='text-xs'>{t('authPage.suspended.help')}</p>
      </div>
    </div>
  )
}

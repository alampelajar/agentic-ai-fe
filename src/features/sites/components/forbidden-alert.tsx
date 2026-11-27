import { ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * The red warning shown when the builder refuses a website it never makes
 * (gambling, betting, pornography). text says which kind and why.
 */
export function ForbiddenAlert({ text }: { text: string }) {
  const { t } = useTranslation()
  return (
    <div
      role='alert'
      className='flex gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-left text-destructive'
    >
      <ShieldAlert className='mt-0.5 size-5 shrink-0' />
      <div className='space-y-1'>
        <p className='text-sm font-semibold'>
          {t('siteBuilder.forbidden.title')}
        </p>
        <p className='text-sm'>{text}</p>
        <p className='text-xs'>{t('siteBuilder.forbidden.help')}</p>
      </div>
    </div>
  )
}

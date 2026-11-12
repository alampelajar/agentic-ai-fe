import { useNavigate, useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function NotFoundError() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>404</h1>
        <span className='font-medium'>{t('errorPages.e404.title')}</span>
        <p className='text-center text-muted-foreground'>
          {t('errorPages.e404.line1')} <br />
          {t('errorPages.e404.line2')}
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            {t('errorPages.goBack')}
          </Button>
          <Button onClick={() => navigate({ to: '/' })}>{t('errorPages.backHome')}</Button>
        </div>
      </div>
    </div>
  )
}

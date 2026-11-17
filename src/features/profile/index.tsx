import { useTranslation } from 'react-i18next'
import { Main } from '@/components/layout/main'
import { AccountForm } from '@/features/settings/account/account-form'
import { ContentSection } from '@/features/settings/components/content-section'

export function ProfilePage() {
  const { t } = useTranslation()

  return (
    <Main fixed fluid className='gap-0'>
      <header className='shrink-0 space-y-2'>
        <p className='text-xs font-semibold tracking-widest text-primary uppercase'>
          {t('profilePage.settings')}
        </p>
        <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
          {t('profilePage.profile')}
        </h1>
        <p className='max-w-3xl text-sm leading-6 text-muted-foreground'>
          {t('profilePage.manageHowYourNameAnd')}
        </p>
      </header>

      <div className='min-h-0 min-w-0 flex-1 overflow-y-auto pb-8'>
        <div className='mt-5 w-full min-w-0'>
          <ContentSection
            title={t('profilePage.profileInformation')}
            desc={t('profilePage.thisInformationIsUsedTo')}
          >
            <AccountForm />
          </ContentSection>
        </div>
      </div>
    </Main>
  )
}

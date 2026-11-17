import { useTranslation } from 'react-i18next'
import { Logo } from '@/assets/logo'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()

  return (
    <div className='min-h-svh bg-background text-foreground'>
      <main className='grid min-h-svh lg:grid-cols-2'>
        <aside className='hidden min-h-svh flex-col border-r bg-muted px-10 py-9 lg:flex xl:px-16 2xl:px-20'>
          <div className='flex items-center gap-2.5'>
            <Logo className='size-7 text-foreground' />
            <span className='text-base font-semibold tracking-tight'>
              {/* design-system-ignore: the product name stays the same in every language */}
              agentic<span className='text-primary'>AI</span>
            </span>
          </div>

          <div className='my-auto max-w-lg py-16'>
            <p className='mb-5 text-xs font-medium tracking-widest text-muted-foreground uppercase'>
              {t('authLayout.eyebrow')}
            </p>

            <h1 className='max-w-md text-4xl leading-tight font-semibold tracking-tight xl:text-5xl'>
              {t('authLayout.headline')}
            </h1>

            <p className='mt-5 max-w-md text-sm leading-7 text-muted-foreground xl:text-base'>
              {t('authLayout.description')}
            </p>

            <div className='mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-5 text-sm text-muted-foreground'>
              <span>{t('authLayout.features.agents')}</span>
              <span className='text-muted-foreground/50' aria-hidden='true'>
                /
              </span>
              <span>{t('authLayout.features.tasks')}</span>
              <span className='text-muted-foreground/50' aria-hidden='true'>
                /
              </span>
              <span>{t('authLayout.features.models')}</span>
            </div>
          </div>

          <p className='text-xs text-muted-foreground'>
            {t('authLayout.footerNote')}
          </p>
        </aside>

        <section className='flex min-h-svh flex-col px-5 py-6 sm:px-8 lg:px-12 xl:px-16'>
          <header className='flex h-10 items-center lg:hidden'>
            <Logo className='me-2 size-6 text-foreground' />
            <span className='text-sm font-semibold tracking-tight'>
              {/* design-system-ignore: the product name stays the same in every language */}
              agentic<span className='text-primary'>AI</span>
            </span>
          </header>

          <div className='flex flex-1 items-center justify-center py-8'>
            <div className='w-full max-w-sm'>{children}</div>
          </div>

          <footer className='flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t pt-5 text-xs text-muted-foreground lg:justify-start'>
            <span>
              {t('authLayout.copyright', { year: new Date().getFullYear() })}
            </span>
            <span>{t('authLayout.privacy')}</span>
            <span>{t('authLayout.terms')}</span>
          </footer>
        </section>
      </main>
    </div>
  )
}

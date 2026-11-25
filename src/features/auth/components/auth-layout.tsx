import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/assets/logo'
import { cn } from '@/lib/utils'

type AuthLayoutProps = {
  children: React.ReactNode
}

/** The product's name with its logo, linking back to the home page. */
function HomeLink({ className, size }: { className?: string; size: 'sm' | 'md' }) {
  const { t } = useTranslation()
  return (
    <Link
      to='/sites'
      aria-label={t('authLayout.home')}
      className={cn(
        'flex w-fit items-center gap-2.5 rounded-md transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className
      )}
    >
      <Logo className={cn('text-foreground', size === 'md' ? 'size-7' : 'size-6')} />
      <span className={cn('font-semibold tracking-tight', size === 'md' ? 'text-base' : 'text-sm')}>
        {/* design-system-ignore: the product name stays the same in every language */}
        THIS MY <span className='text-primary'>WEBSITE</span>
      </span>
    </Link>
  )
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()

  return (
    <div className='min-h-svh bg-background text-foreground'>
      <main className='grid min-h-svh lg:grid-cols-2'>
        <aside className='hidden min-h-svh flex-col border-r bg-muted px-10 py-9 lg:flex xl:px-16 2xl:px-20'>
          <HomeLink size='md' />

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

            <ol className='mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-5 text-sm text-muted-foreground'>
              <li>{t('authLayout.features.describe')}</li>
              <li className='text-muted-foreground/50' aria-hidden='true'>
                /
              </li>
              <li>{t('authLayout.features.preview')}</li>
              <li className='text-muted-foreground/50' aria-hidden='true'>
                /
              </li>
              <li>{t('authLayout.features.publish')}</li>
            </ol>
          </div>

          <p className='text-xs text-muted-foreground'>
            {t('authLayout.footerNote')}
          </p>
        </aside>

        <section className='flex min-h-svh flex-col px-5 py-6 sm:px-8 lg:px-12 xl:px-16'>
          <header className='flex h-10 items-center lg:hidden'>
            <HomeLink size='sm' className='gap-2' />
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
